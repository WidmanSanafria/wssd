import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'wssd-default-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class DefaultLayoutComponent {}
