import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerEditPage } from './player-edit.page';

describe('PlayerEditPage', () => {
  let component: PlayerEditPage;
  let fixture: ComponentFixture<PlayerEditPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PlayerEditPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
