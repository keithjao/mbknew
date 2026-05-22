import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface MerchPlaceholder {
  name: string;
  note: string;
  eta: string;
  status: 'preview' | 'coming soon';
}

@Component({
  selector: 'app-merchandise',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './merchandise.html',
  styleUrl: './merchandise.scss',
})
export class Merchandise {
  protected readonly placeholders: MerchPlaceholder[] = [
    {
      name: 'ceremonial whisk set',
      note: 'bamboo whisk, holder, and scoop in a gift sleeve',
      eta: 'target release: june',
      status: 'preview',
    },
    {
      name: 'stoneware cup collection',
      note: 'limited neutral glazes inspired by morning tea rituals',
      eta: 'target release: july',
      status: 'coming soon',
    },
    {
      name: 'linen cafe tote',
      note: 'daily carry tote with subtle brand mark and inner pocket',
      eta: 'target release: august',
      status: 'coming soon',
    },
  ];
}
