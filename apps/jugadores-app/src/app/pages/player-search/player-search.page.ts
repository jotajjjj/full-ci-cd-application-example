import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router'; // ← CORRECCIÓN: Importar desde @angular/router
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButtons,
  IonMenuButton,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { people } from 'ionicons/icons';

import { PlayerService } from '../../services/player.service';
import { Player } from '../../models/player';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-player-search',
  templateUrl: './player-search.page.html',
  styleUrls: ['./player-search.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule, // ← CORRECCIÓN: Agregar aquí también
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButtons,
    IonMenuButton,
    IonText
  ]
})
export class PlayerSearchPage {
  searchResults: Player[] = [];
  searchTerm: string = '';
  hasSearched: boolean = false;
  
  private searchSubject = new Subject<string>();

  constructor(private playerService: PlayerService) {
    addIcons({ people });
    this.setupSearch();
  }

  setupSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  searchPlayers(event: any) {
    const searchTerm = event.target.value;
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  performSearch(term: string) {
    if (term.trim() === '') {
      this.searchResults = [];
      this.hasSearched = false;
      return;
    }

    this.playerService.searchPlayers(term).subscribe(
      (data: Player[]) => {
        this.searchResults = data;
        this.hasSearched = true;
      },
      (error) => {
        console.error('Error searching players', error);
        this.searchResults = [];
        this.hasSearched = true;
      }
    );
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'presente': return 'success';
      case 'ausencia_justificada': return 'warning';
      case 'ausencia_injustificada': return 'danger';
      case 'vacaciones': return 'primary';
      default: return 'medium';
    }
  }
  
}