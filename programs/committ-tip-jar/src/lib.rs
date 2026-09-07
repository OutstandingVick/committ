use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

declare_id!("BWWJ1RDYeu8UfC4D4258zWpK8EDA1fBeoPap8zu6tFnR");

#[program]
pub mod committ_tip_jar {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, repo_hash: [u8; 32]) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        campaign.authority = ctx.accounts.authority.key();
        campaign.repo_hash = repo_hash;
        campaign.total_tipped = 0;
        campaign.total_withdrawn = 0;
        campaign.bump = ctx.bumps.campaign;
        emit!(CampaignCreated {
            campaign: campaign.key(),
            authority: campaign.authority,
            repo_hash,
        });
        Ok(())
    }

    pub fn tip(ctx: Context<Tip>, amount: u64) -> Result<()> {
        require!(amount > 0, TipJarError::ZeroAmount);
        let transfer = Transfer {
            from: ctx.accounts.tipper.to_account_info(),
            to: ctx.accounts.campaign.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer),
            amount,
        )?;
        let campaign = &mut ctx.accounts.campaign;
        campaign.total_tipped = campaign
            .total_tipped
            .checked_add(amount)
            .ok_or(TipJarError::ArithmeticOverflow)?;
        emit!(TipReceived {
            campaign: campaign.key(),
            tipper: ctx.accounts.tipper.key(),
            amount,
        });
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, TipJarError::ZeroAmount);
        let campaign_info = ctx.accounts.campaign.to_account_info();
        let rent_floor = Rent::get()?.minimum_balance(Campaign::SPACE);
        let available = campaign_info
            .lamports()
            .checked_sub(rent_floor)
            .ok_or(TipJarError::InsufficientFunds)?;
        require!(amount <= available, TipJarError::InsufficientFunds);

        ctx.accounts.campaign.sub_lamports(amount)?;
        ctx.accounts.authority.add_lamports(amount)?;
        let campaign = &mut ctx.accounts.campaign;
        campaign.total_withdrawn = campaign
            .total_withdrawn
            .checked_add(amount)
            .ok_or(TipJarError::ArithmeticOverflow)?;
        emit!(Withdrawal {
            campaign: campaign.key(),
            authority: ctx.accounts.authority.key(),
            amount,
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(repo_hash: [u8; 32])]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = Campaign::SPACE,
        seeds = [b"campaign", authority.key().as_ref(), repo_hash.as_ref()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Tip<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.authority.as_ref(), campaign.repo_hash.as_ref()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub tipper: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = authority @ TipJarError::Unauthorized,
        seeds = [b"campaign", campaign.authority.as_ref(), campaign.repo_hash.as_ref()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub authority: Pubkey,
    pub repo_hash: [u8; 32],
    pub total_tipped: u64,
    pub total_withdrawn: u64,
    pub bump: u8,
}

impl Campaign {
    pub const SPACE: usize = 8 + Self::INIT_SPACE;
}

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub authority: Pubkey,
    pub repo_hash: [u8; 32],
}

#[event]
pub struct TipReceived {
    pub campaign: Pubkey,
    pub tipper: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Withdrawal {
    pub campaign: Pubkey,
    pub authority: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum TipJarError {
    #[msg("Tip and withdrawal amounts must be greater than zero.")]
    ZeroAmount,
    #[msg("The campaign does not have enough withdrawable SOL.")]
    InsufficientFunds,
    #[msg("Only the recorded campaign authority can withdraw.")]
    Unauthorized,
    #[msg("Campaign accounting overflowed.")]
    ArithmeticOverflow,
}
