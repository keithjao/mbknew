import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  template: `
    <div class="qr-scanner">
      <video #video width="320" height="240" autoplay></video>
      <button (click)="closeScanner()">Close</button>
    </div>
  `,
  styleUrls: ['./qr-scanner.scss']
})
export class QrScanner {
  @Output() scanned = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  // TODO: Implement real QR scanning logic using a library like @zxing/browser
  closeScanner() {
    this.closed.emit();
  }
}
