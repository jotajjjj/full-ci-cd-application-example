import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router'; // ← Importar desde @angular/router
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonIcon,
  IonButtons,
  IonMenuButton,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonBadge,
  IonFab,
  IonFabButton,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, search, trash, people } from 'ionicons/icons';

// Servicios e interfaces
import { PlayerService } from '../../services/player.service';
import { Player } from '../../models/player';

@Component({
  selector: 'app-player-list',
  templateUrl: './player-list.page.html',
  styleUrls: ['./player-list.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule, // ← Agregar aquí
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonButtons,
    IonMenuButton,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonBadge,
    IonFab,
    IonFabButton,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent
  ]
})
export class PlayerListPage implements OnInit {
  players: Player[] = [];

  constructor(
    private playerService: PlayerService,
    private alertController: AlertController
  ) {
    addIcons({ add, search, trash, people });
  }

  ngOnInit() {
    this.loadPlayers();
  }

  loadPlayers() {
    this.playerService.getPlayers().subscribe(
      (data: Player[]) => {
        this.players = data;
      },
      (error) => {
        console.error('Error loading players', error);
      }
    );
  }

  refreshPlayers(event: any) {
    this.playerService.getPlayers().subscribe(
      (data: Player[]) => {
        this.players = data;
        event.target.complete();
      },
      (error) => {
        console.error('Error refreshing players', error);
        event.target.complete();
      }
    );
  }

  loadMorePlayers(event: any) {
    // Implementar carga paginada si es necesario
    setTimeout(() => {
      event.target.complete();
    }, 500);
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

  async deletePlayer(player: Player) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar a ${player.nombre} ${player.apellido}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: () => {
            if (player.id) {
              this.playerService.deletePlayer(player.id).subscribe(
                () => {
                  this.loadPlayers();
                },
                (error) => {
                  console.error('Error deleting player', error);
                }
              );
            }
          }
        }
      ]
    });

    await alert.present();
  }
}