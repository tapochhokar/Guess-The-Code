# 🎮 Code Breaker: Logic Game

A sleek, modern, and mobile-responsive implementation of the classic "Bulls and Cows" logic game. Built with a focus on premium UI/UX, tactile feedback, and intuitive interactions.

## 📂 File Architecture

The project is divided into three core files to maintain a clean separation of concerns:

| File | Purpose |
| --- | --- |
| `index.html` | Defines the app structure, screen states, and semantic layout. |
| `style.css` | Handles the "Mobile-First" responsive design, animations, and premium aesthetics. |
| `script.js` | Manages the game engine, state, OTP input logic, and win/loss effects. |

---

## 🚀 Getting Started

1. **Download** the three files (`index.html`, `style.css`, `script.js`).
2. **Place** them in the same folder.
3. **Open** `index.html` in any modern web browser (Chrome, Safari, Firefox, or Edge).

---

## ✨ Key Features

### 1. Mobile-First Responsive Design

The UI is built using a "Bottom-Up" approach.

* **Mobile:** Full-screen immersive experience with large touch targets.
* **Desktop:** Automatically centers into a "Phone Frame" with soft shadows to maintain the intended game feel.

### 2. OTP-Style Input Module

Instead of a standard text box, the game uses individual digit cells.

* **Auto-Focus:** Moving to the next digit automatically after typing.
* **Tactile Feedback:** Visual "lift" effect when a cell is focused.
* **Accessibility:** Uses `inputmode="numeric"` to trigger the number pad on mobile devices.

### 3. Hint System

Players can request up to **3 hints**. Each hint reveals a random digit from the secret code to help when logic reaches a stalemate.

### 4. Advanced Logic Engine

The algorithm correctly handles duplicate numbers.

* **Bulls (Green):** Correct number in the correct spot.
* **Cows (Yellow):** Correct number but in the wrong spot.
* The engine ensures a digit is only counted once per guess (e.g., guessing `11` against a secret of `12` results in only one Bull).

---

## 🛠️ Technical Implementation

### Animations

The game uses standard CSS Keyframes for high performance:

* `slideDown`: Used for history log entries.
* `shake-anim`: Triggered on invalid input or incorrect length.
* `bounce`: Applied to victory icons.

### State Management

The `state` object in `script.js` tracks the secret code, remaining attempts, and hints used in real-time, ensuring the UI stays synchronized with the game logic.

---

## 🎨 Customization

To change the primary theme color, simply modify the CSS Variables at the top of `style.css`:

```css
:root {
    --primary: #6366f1; /* Change this hex code to your brand color */
}

```
