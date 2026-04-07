# 🧬 CellWorld Daily Challenge — README Completo (MVP + 1vs1 por turnos)

---

# 🎯 DESCRIPCIÓN

**CellWorld Daily Challenge** es un juego mobile-first basado en un sistema de autómatas celulares tipo *Juego de la Vida*, con dos modos principales:

* 📅 **Desafío diario (single player)**
* ⚔️ **Multijugador 1 vs 1 por turnos (online)**

Arquitectura híbrida:

* Backend: Node.js + Express
* Servicios: Firebase (Firestore, Auth, Notifications)
* Frontend: HTML + CSS + JS (Canvas)
* Android: Cordova

---

# 🏗️ ARQUITECTURA GENERAL

## 🧠 Principio clave

* **Servidor (Node) = fuente de verdad**
* Cliente = input + render

---

## 📡 Flujo general

```text
Cliente → Node API → Firebase
         ←          ←
```

---

# 📱 FLUJO DE LA APP

```text
App Start
 → Splash
 → Load config + texts + notifications
 → Pantalla inicial (Home)
```

---

# 🟣 PANTALLA INICIAL (HOME)

```text
[ LOGO / GRID ANIMADO ]

[ 📅 DESAFÍO DIARIO ]
[ 🚗 MODO PRÁCTICA ]
[ ⚔️ MULTIJUGADOR ]

[ ⚙️ AJUSTES ]
```

---

# 📅 MODO DESAFÍO DIARIO

## Flujo:

```text
Ver reto
 → Jugar
 → Resultado
 → Leaderboard
```

---

# 🚗 MODO PRÁCTICA

## Flujo:

```text
Ver reto
 → Jugar
 → Resultado
 → Leaderboard
```

---

# ⚔️ MODO MULTIJUGADOR 1 VS 1 (TURNOS)

---

# 🧠 CONCEPTO

Dos jugadores compiten en un grid compartido, colocando células por turnos y dejando que evolucionen automáticamente.

---

# 🔄 FLUJO COMPLETO

```text
Entrar a multijugador
 → Matchmaking
 → Inicio partida
 → Turno A (coloca)
 → Turno B (coloca)
 → Simulación (N generaciones)
 → Nueva ronda
 → ...
 → Fin partida
 → Resultado
```

---

# 🔍 MATCHMAKING

## Endpoint:

```http
POST /matchmaking
```

## Lógica:

* Buscar partida abierta
* Si existe → unir jugador
* Si no → crear nueva

---

# 🎬 ESTADO INICIAL DE PARTIDA

```json
{
  "matchId": "uuid",
  "players": ["A", "B"],
  "grid": [],
  "turn": "A",
  "round": 1,
  "phase": "placement",
  "cellsPerTurn": 3,
  "maxRounds": 10
}
```

---

# ⚙️ FASES DE PARTIDA

## 1. 🟢 Placement (colocación)

* Jugadores colocan células
* Turnos alternos

---

## 2. 🔵 Simulation (simulación)

* Servidor ejecuta evolución del grid
* N generaciones (ej: 5)

---

## 3. 🔁 Loop

* Incrementar ronda
* Volver a placement

---

# 🎮 REGLAS DEL JUEGO

Basado en autómata celular con propiedad de células.

---

## 🟢 Nacimiento

* Nace si hay 3 vecinos
* Pertenece al jugador con mayoría

---

## 🔵 Supervivencia

* 2 o 3 vecinos → sobrevive
* Vecinos de cualquier tipo

---

## 🔴 Conquista

* Si mayoría de vecinos son enemigos
  → cambia de dueño

---

# 🧩 CONDICIONES PARA COLOCAR CÉLULAS

## ✅ Reglas obligatorias

1. Casilla vacía
2. Es tu turno
3. No superar límite por turno

---

## 🎯 Regla clave (estrategia)

```text
Solo puedes colocar células en casillas adyacentes a una célula tuya
```

(8 direcciones posibles)

---

## 🚫 No permitido

* Casillas ocupadas
* Fuera del grid
* Sin turno
* Sin movimientos restantes

---

# 🧠 VALIDACIÓN EN BACKEND

```javascript
function isValidMove(cell, player, grid, turn, movesLeft) {
  if (turn !== player) return false;
  if (cell.isOccupied) return false;
  if (movesLeft <= 0) return false;
  if (!hasAdjacentOwnCell(cell, player, grid)) return false;

  return true;
}
```

---

# 📤 ENVÍO DE ACCIONES

```http
POST /match/:id/action
```

```json
{
  "playerId": "A",
  "cells": [[x,y], [x,y]]
}
```

---

# 🔁 SIMULACIÓN (SERVER)

```javascript
for (let i = 0; i < generations; i++) {
  grid = nextGeneration(grid);
}
```

---

# 🏁 FIN DE PARTIDA

## Condiciones:

* Rondas completadas
* Un jugador sin células

---

# 📊 RESULTADO

```json
{
  "winner": "A",
  "cellsA": 120,
  "cellsB": 80
}
```

---

# 👤 USUARIO

* ID anónimo (localStorage)
* Login opcional con Firebase

---

# 🗄️ FIRESTORE

## daily_configs

* Configuración diaria

## texts

* UI, tutorial, notificaciones

## notifications

* Configuración de notificaciones

---

# 🧠 NODE BACKEND

## Responsabilidades

* Matchmaking
* Estado de partidas
* Validación de jugadas
* Simulación del grid
* Leaderboard

---

# 🔌 API

## Partidas

* POST /matchmaking
* GET /match/:id
* POST /match/:id/action

## Juego

* GET /leaderboard
* POST /submit-score

---

# 🎓 TUTORIAL

* Solo primera vez
* Overlay interactivo
* 4 pasos máximo
* Textos desde Firestore

---

# 🔔 NOTIFICACIONES

* Definidas en Firestore
* Evaluadas en cliente
* Enviadas como:

  * Local (Cordova)
  * Push (Firebase)

Condición:

* Solo si no completó el reto diario

---

# 🎨 UI

* Dark mode (#0b0f1a)
* Células neón
* Layout:

```text
[HUD]
[GRID]
[CONTROLES]
```

---

# 🚀 ESCALABILIDAD

Fase 1:

* 1 servidor Node

Fase 2:

* Multiples instancias
* Balanceador

Fase 3:

* Redis (estado partidas)

---

# ⚠️ REGLAS CLAVE DEL PROYECTO

* No lógica crítica en cliente
* Validación siempre en servidor
* Evitar spam de acciones
* Mobile-first siempre

---

# 🧭 RESUMEN

Este proyecto combina:

* Simulación emergente
* Estrategia por turnos
* Competición online

Con una base sólida para escalar hacia un juego completo.

---
