import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // ← AÑADIR esta importación

import { 
  IonApp, 
  IonSplitPane, 
  IonMenu, 
  IonContent, 
  IonList, 
  IonListHeader, 
  IonMenuToggle, 
  IonItem, 
  IonIcon, 
  IonLabel, 
  IonRouterOutlet 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { people } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    RouterModule,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonListHeader,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonRouterOutlet
  ]
})
export class AppComponent {
  public appPages = [
    { title: 'Gestionar Jugadores', url: '/player-list', icon: 'people' }
  ];
  
  constructor() {
    addIcons({ people });
  }
}