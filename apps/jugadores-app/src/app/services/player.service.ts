import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player } from '../models/player';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private apiUrl = 'http://localhost:8080/api/players'; // Ajusta según tu API

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  getPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getPlayer(id: number): Observable<Player> {
    return this.http.get<Player>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createPlayer(player: Player): Observable<Player> {
    return this.http.post<Player>(this.apiUrl, player, { headers: this.getHeaders() });
  }

  updatePlayer(id: number, player: Player): Observable<Player> {
    return this.http.put<Player>(`${this.apiUrl}/${id}`, player, { headers: this.getHeaders() });
  }

  deletePlayer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  searchPlayers(term: string): Observable<Player[]> {
    const params = new HttpParams().set('search', term);
    return this.http.get<Player[]>(`${this.apiUrl}/search`, { 
      headers: this.getHeaders(), 
      params: params 
    });
  }
}