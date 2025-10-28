import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerCreatePage } from './player-create.page';

describe('PlayerCreatePage', () => {
  let component: PlayerCreatePage;
  let fixture: ComponentFixture<PlayerCreatePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PlayerCreatePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
