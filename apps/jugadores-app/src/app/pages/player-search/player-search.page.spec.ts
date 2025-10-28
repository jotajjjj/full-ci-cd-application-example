import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerSearchPage } from './player-search.page';

describe('PlayerSearchPage', () => {
  let component: PlayerSearchPage;
  let fixture: ComponentFixture<PlayerSearchPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PlayerSearchPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
