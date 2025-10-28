import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonButtons,
  IonMenuButton,
  IonFooter,
  IonText,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { save, people } from 'ionicons/icons';
import { Router, ActivatedRoute } from '@angular/router';

import { PlayerService } from '../../services/player.service';
import { Player } from '../../models/player';

@Component({
  selector: 'app-player-edit',
  templateUrl: './player-edit.page.html',
  styleUrls: ['./player-edit.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonButtons,
    IonMenuButton,
    IonFooter,
    IonText
  ]
})
export class PlayerEditPage implements OnInit {
  player: Player = {
    nombre: '',
    apellido: '',
    equipo: '',
    descripcion: '',
    estado: 'presente'
  };

  constructor(
    private playerService: PlayerService,
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController
  ) {
    addIcons({ save, people });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPlayer(parseInt(id, 10));
    }
  }

  loadPlayer(id: number) {
    this.playerService.getPlayer(id).subscribe(
      (data: Player) => {
        this.player = data;
      },
      (error) => {
        console.error('Error loading player', error);
      }
    );
  }

  updatePlayer() {
    if (this.player.id) {
      this.playerService.updatePlayer(this.player.id, this.player).subscribe(
        (response) => {
          this.showSuccessAlert();
          this.router.navigate(['/player-list']);
        },
        (error) => {
          console.error('Error updating player', error);
          this.showErrorAlert();
        }
      );
    }
  }

  async showSuccessAlert() {
    const alert = await this.alertController.create({
      header: 'Éxito',
      message: 'Jugador actualizado correctamente',
      buttons: ['OK']
    });
    await alert.present();
  }

  async showErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Error',
      message: 'No se pudo actualizar el jugador',
      buttons: ['OK']
    });
    await alert.present();
  }
}