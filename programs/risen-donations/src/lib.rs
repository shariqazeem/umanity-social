use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("9JBsHFy9rQhjcPiKkFzqxpUV9HZyZ1ZmE4AWXc1Kiys1");

#[program]
pub mod umanity_donations {
    use super::*;

    // Initialize donation pool
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        name: String,
        description: String,
        emoji: String,
        pool_type: u8,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.name = name;
        pool.description = description;
        pool.emoji = emoji;
        pool.pool_type = pool_type;
        pool.total_donated = 0;
        pool.donor_count = 0;
        pool.is_active = true;
        pool.bump = ctx.bumps.pool;
        Ok(())
    }

    // One-tap donation (1 USDC)
    pub fn one_tap_donate(ctx: Context<OneTapDonate>) -> Result<()> {
        let amount = 1_000_000; // 1 USDC (6 decimals)

        // Transfer SOL equivalent of $1
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.donor.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, amount)?;

        // Update pool stats
        let pool = &mut ctx.accounts.pool;
        pool.total_donated = pool.total_donated.checked_add(amount).unwrap();
        pool.donor_count = pool.donor_count.checked_add(1).unwrap();

        // Record donation
        let donation_record = &mut ctx.accounts.donation_record;
        donation_record.donor = ctx.accounts.donor.key();
        donation_record.pool = ctx.accounts.pool.key();
        donation_record.amount = amount;
        donation_record.timestamp = Clock::get()?.unix_timestamp;
        donation_record.donation_type = 0; // One-tap

        emit!(DonationMade {
            donor: ctx.accounts.donor.key(),
            pool: ctx.accounts.pool.key(),
            amount,
            donation_type: 0,
        });

        Ok(())
    }

    // Custom amount donation to pool
    pub fn donate_to_pool(
        ctx: Context<DonateToPool>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Transfer SOL
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.donor.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, amount)?;

        // Update pool stats
        let pool = &mut ctx.accounts.pool;
        pool.total_donated = pool.total_donated.checked_add(amount).unwrap();
        pool.donor_count = pool.donor_count.checked_add(1).unwrap();

        // Record donation
        let donation_record = &mut ctx.accounts.donation_record;
        donation_record.donor = ctx.accounts.donor.key();
        donation_record.pool = ctx.accounts.pool.key();
        donation_record.amount = amount;
        donation_record.timestamp = Clock::get()?.unix_timestamp;
        donation_record.donation_type = 1; // Custom pool

        emit!(DonationMade {
            donor: ctx.accounts.donor.key(),
            pool: ctx.accounts.pool.key(),
            amount,
            donation_type: 1,
        });

        Ok(())
    }

    // Withdraw from pool (admin only)
    pub fn withdraw_from_pool(
        ctx: Context<WithdrawFromPool>,
        amount: u64,
        _recipient: Pubkey,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let pool = &ctx.accounts.pool;
        let vault_balance = ctx.accounts.pool_vault.lamports();
        require!(vault_balance >= amount, ErrorCode::InsufficientFunds);

        // Transfer from vault to recipient
        **ctx.accounts.pool_vault.try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.recipient.try_borrow_mut_lamports()? += amount;

        emit!(PoolWithdrawal {
            pool: pool.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
        });

        Ok(())
    }

    // Create campaign with milestones (escrow overlay on existing pool)
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        recipient: Pubkey,
        target_amount: u64,
        deadline: i64,
        milestone_descriptions: Vec<String>,
        milestone_percentages: Vec<u8>,
    ) -> Result<()> {
        let milestone_count = milestone_descriptions.len() as u8;
        require!(milestone_count > 0 && milestone_count <= 5, ErrorCode::InvalidMilestoneCount);
        require!(milestone_descriptions.len() == milestone_percentages.len(), ErrorCode::InvalidMilestoneCount);

        // Validate percentages sum to 100
        let total_pct: u16 = milestone_percentages.iter().map(|p| *p as u16).sum();
        require!(total_pct == 100, ErrorCode::InvalidPercentages);

        let campaign = &mut ctx.accounts.campaign;
        campaign.pool = ctx.accounts.pool.key();
        campaign.authority = ctx.accounts.authority.key();
        campaign.recipient = recipient;
        campaign.target_amount = target_amount;
        campaign.total_raised = 0;
        campaign.donor_count = 0;
        campaign.milestone_count = milestone_count;
        campaign.milestones_completed = 0;
        campaign.deadline = deadline;
        campaign.is_active = true;
        campaign.bump = ctx.bumps.campaign;

        emit!(CampaignCreated {
            campaign: campaign.key(),
            pool: ctx.accounts.pool.key(),
            target_amount,
            milestone_count,
        });

        Ok(())
    }

    // Initialize a milestone for a campaign
    pub fn init_milestone(
        ctx: Context<InitMilestone>,
        index: u8,
        description: String,
        percentage: u8,
    ) -> Result<()> {
        require!(description.len() <= 100, ErrorCode::DescriptionTooLong);

        let milestone = &mut ctx.accounts.milestone;
        milestone.campaign = ctx.accounts.campaign.key();
        milestone.index = index;
        milestone.description = description;
        milestone.percentage = percentage;
        milestone.status = 0; // Pending
        milestone.approved_at = 0;
        milestone.released_at = 0;
        milestone.amount_released = 0;
        milestone.bump = ctx.bumps.milestone;

        Ok(())
    }

    // Approve milestone (authority only)
    pub fn approve_milestone(ctx: Context<ApproveMilestone>) -> Result<()> {
        let milestone = &mut ctx.accounts.milestone;
        require!(milestone.status == 0, ErrorCode::MilestoneNotPending);

        milestone.status = 1; // Approved
        milestone.approved_at = Clock::get()?.unix_timestamp;

        emit!(MilestoneApproved {
            campaign: ctx.accounts.campaign.key(),
            milestone_index: milestone.index,
        });

        Ok(())
    }

    // Release milestone funds (requires approved status)
    pub fn release_milestone_funds(ctx: Context<ReleaseMilestoneFunds>) -> Result<()> {
        let milestone = &mut ctx.accounts.milestone;
        let campaign = &mut ctx.accounts.campaign;

        require!(milestone.status == 1, ErrorCode::MilestoneNotApproved);

        // Calculate release amount: (percentage * total_raised) / 100
        let release_amount = (milestone.percentage as u64)
            .checked_mul(campaign.total_raised)
            .unwrap()
            .checked_div(100)
            .unwrap();

        let vault_balance = ctx.accounts.pool_vault.lamports();
        require!(vault_balance >= release_amount, ErrorCode::InsufficientFunds);

        // Transfer from vault to recipient
        **ctx.accounts.pool_vault.try_borrow_mut_lamports()? -= release_amount;
        **ctx.accounts.recipient.try_borrow_mut_lamports()? += release_amount;

        milestone.status = 2; // Released
        milestone.released_at = Clock::get()?.unix_timestamp;
        milestone.amount_released = release_amount;

        campaign.milestones_completed = campaign.milestones_completed.checked_add(1).unwrap();

        emit!(MilestoneReleased {
            campaign: campaign.key(),
            milestone_index: milestone.index,
            amount: release_amount,
            recipient: campaign.recipient,
        });

        Ok(())
    }

    // Claim refund (if deadline passed and milestones incomplete)
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        let donation_record = &ctx.accounts.donation_record;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp > campaign.deadline, ErrorCode::DeadlineNotReached);
        require!(campaign.milestones_completed < campaign.milestone_count, ErrorCode::AllMilestonesComplete);

        // Calculate proportional refund based on unreleased percentage
        let released_pct = (campaign.milestones_completed as u64) * 100 / (campaign.milestone_count as u64);
        let unreleased_pct = 100 - released_pct;

        // Donor's proportional refund = (donation_amount * unreleased_pct) / 100
        let refund_amount = donation_record.amount
            .checked_mul(unreleased_pct)
            .unwrap()
            .checked_div(100)
            .unwrap();

        let vault_balance = ctx.accounts.pool_vault.lamports();
        require!(vault_balance >= refund_amount, ErrorCode::InsufficientFunds);

        // Transfer refund
        **ctx.accounts.pool_vault.try_borrow_mut_lamports()? -= refund_amount;
        **ctx.accounts.donor.try_borrow_mut_lamports()? += refund_amount;

        emit!(RefundClaimed {
            campaign: campaign.key(),
            donor: ctx.accounts.donor.key(),
            amount: refund_amount,
        });

        Ok(())
    }
}

// ===== Existing Contexts =====

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"pool", name.as_bytes()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Pool vault PDA
    #[account(
        seeds = [b"vault", pool.key().as_ref()],
        bump
    )]
    pub pool_vault: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OneTapDonate<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    /// CHECK: Pool vault PDA
    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump
    )]
    pub pool_vault: AccountInfo<'info>,

    #[account(
        init,
        payer = donor,
        space = 8 + DonationRecord::INIT_SPACE
    )]
    pub donation_record: Account<'info, DonationRecord>,

    #[account(mut)]
    pub donor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DonateToPool<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    /// CHECK: Pool vault PDA
    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump
    )]
    pub pool_vault: AccountInfo<'info>,

    #[account(
        init,
        payer = donor,
        space = 8 + DonationRecord::INIT_SPACE
    )]
    pub donation_record: Account<'info, DonationRecord>,

    #[account(mut)]
    pub donor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFromPool<'info> {
    #[account(
        mut,
        has_one = authority
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Pool vault PDA
    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump
    )]
    pub pool_vault: AccountInfo<'info>,

    /// CHECK: Recipient account
    #[account(mut)]
    pub recipient: AccountInfo<'info>,

    pub authority: Signer<'info>,
}

// ===== Campaign/Escrow Contexts =====

#[derive(Accounts)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [b"campaign", pool.key().as_ref()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,

    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct InitMilestone<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Milestone::INIT_SPACE,
        seeds = [b"milestone", campaign.key().as_ref(), &[index]],
        bump
    )]
    pub milestone: Account<'info, Milestone>,

    #[account(has_one = authority)]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveMilestone<'info> {
    #[account(mut)]
    pub milestone: Account<'info, Milestone>,

    #[account(
        has_one = authority,
        constraint = milestone.campaign == campaign.key()
    )]
    pub campaign: Account<'info, Campaign>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReleaseMilestoneFunds<'info> {
    #[account(mut)]
    pub milestone: Account<'info, Milestone>,

    #[account(
        mut,
        has_one = authority,
        constraint = milestone.campaign == campaign.key()
    )]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: Pool vault PDA
    #[account(mut)]
    pub pool_vault: AccountInfo<'info>,

    /// CHECK: Recipient receives funds
    #[account(
        mut,
        constraint = recipient.key() == campaign.recipient
    )]
    pub recipient: AccountInfo<'info>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    pub campaign: Account<'info, Campaign>,

    #[account(
        constraint = donation_record.donor == donor.key(),
        constraint = donation_record.pool == campaign.pool
    )]
    pub donation_record: Account<'info, DonationRecord>,

    /// CHECK: Pool vault PDA
    #[account(mut)]
    pub pool_vault: AccountInfo<'info>,

    #[account(mut)]
    pub donor: Signer<'info>,
}

// ===== Accounts =====

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub authority: Pubkey,
    #[max_len(50)]
    pub name: String,
    #[max_len(200)]
    pub description: String,
    #[max_len(10)]
    pub emoji: String,
    pub pool_type: u8, // 0: Medical, 1: Education, 2: Emergency, etc.
    pub total_donated: u64,
    pub donor_count: u64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct DonationRecord {
    pub donor: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub donation_type: u8, // 0: One-tap, 1: Custom pool, 2: Tip
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub recipient: Pubkey,
    pub target_amount: u64,
    pub total_raised: u64,
    pub donor_count: u64,
    pub milestone_count: u8,
    pub milestones_completed: u8,
    pub deadline: i64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Milestone {
    pub campaign: Pubkey,
    pub index: u8,
    #[max_len(100)]
    pub description: String,
    pub percentage: u8,
    pub status: u8,           // 0:Pending, 1:Approved, 2:Released, 3:Rejected
    pub approved_at: i64,
    pub released_at: i64,
    pub amount_released: u64,
    pub bump: u8,
}

// ===== Events =====

#[event]
pub struct DonationMade {
    pub donor: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub donation_type: u8,
}

#[event]
pub struct PoolWithdrawal {
    pub pool: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub pool: Pubkey,
    pub target_amount: u64,
    pub milestone_count: u8,
}

#[event]
pub struct MilestoneApproved {
    pub campaign: Pubkey,
    pub milestone_index: u8,
}

#[event]
pub struct MilestoneReleased {
    pub campaign: Pubkey,
    pub milestone_index: u8,
    pub amount: u64,
    pub recipient: Pubkey,
}

#[event]
pub struct RefundClaimed {
    pub campaign: Pubkey,
    pub donor: Pubkey,
    pub amount: u64,
}

// ===== Errors =====

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid milestone count (must be 1-5)")]
    InvalidMilestoneCount,
    #[msg("Milestone percentages must sum to 100")]
    InvalidPercentages,
    #[msg("Milestone is not in pending status")]
    MilestoneNotPending,
    #[msg("Milestone is not approved")]
    MilestoneNotApproved,
    #[msg("Campaign deadline has not been reached")]
    DeadlineNotReached,
    #[msg("All milestones are already complete")]
    AllMilestonesComplete,
    #[msg("Description too long (max 100 chars)")]
    DescriptionTooLong,
}
