import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'wssd-empty-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class EmptyLayoutComponent {}
