import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerListPage } from './player-list.page';

describe('PlayerListPage', () => {
  let component: PlayerListPage;
  let fixture: ComponentFixture<PlayerListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PlayerListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
