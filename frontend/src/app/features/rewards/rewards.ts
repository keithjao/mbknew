import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface RewardTier {
  name: 'silver' | 'gold' | 'platinum';
  spendRange: string;
  pointsRate: string;
  benefits: string[];
}

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rewards.html',
  styleUrl: './rewards.scss',
})
export class Rewards {
  protected readonly tiers: RewardTier[] = [
    {
      name: 'silver',
      spendRange: 'spend up to ¥12,000 / month',
      pointsRate: '1x points on all drinks',
      benefits: [
        'free size upgrade once per month',
        'birthday drink at 50% off',
        'early notice for seasonal menu drops',
      ],
    },
    {
      name: 'gold',
      spendRange: 'spend ¥12,001 - ¥30,000 / month',
      pointsRate: '1.5x points on all drinks',
      benefits: [
        'free handcrafted drink every 12 purchases',
        'priority access to new merchandise drops',
        'monthly members-only tasting invite',
      ],
    },
    {
      name: 'platinum',
      spendRange: 'spend above ¥30,000 / month',
      pointsRate: '2x points on all drinks',
      benefits: [
        'one complimentary signature drink weekly',
        'dedicated preorder window for limited items',
        'quarterly private tea workshop access',
      ],
    },
  ];
}
