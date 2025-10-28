import { Component } from '@angular/core';
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
  IonText, // ← AÑADIR ESTA IMPORTACIÓN
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { save, people } from 'ionicons/icons';
import { Router } from '@angular/router';

import { PlayerService } from '../../services/player.service';
import { Player } from '../../models/player';

@Component({
  selector: 'app-player-create',
  templateUrl: './player-create.page.html',
  styleUrls: ['./player-create.page.scss'],
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
    IonText // ← AÑADIR ESTA IMPORTACIÓN
  ]
})
export class PlayerCreatePage {
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
    private alertController: AlertController
  ) {
    addIcons({ save, people });
  }

  savePlayer() {
    this.playerService.createPlayer(this.player).subscribe(
      (response) => {
        this.showSuccessAlert();
        this.router.navigate(['/player-list']);
      },
      (error) => {
        console.error('Error creating player', error);
        this.showErrorAlert();
      }
    );
  }

  async showSuccessAlert() {
    const alert = await this.alertController.create({
      header: 'Éxito',
      message: 'Jugador creado correctamente',
      buttons: ['OK']
    });
    await alert.present();
  }

  async showErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Error',
      message: 'No se pudo crear el jugador',
      buttons: ['OK']
    });
    await alert.present();
  }
}