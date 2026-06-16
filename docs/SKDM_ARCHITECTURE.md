# Spatial Keystroke Dynamics Model (SKDM) Architecture

This document describes the Spatial Keystroke Dynamics Model (SKDM), which visualizes and analyzes typing habits and latency in a 3D space.

## 1. System Overview

The model is divided into two primary visualizations:
1. **Key-Centric Vector Model (Cylindrical)**: A flower-like shape representing incoming keystrokes for a specific key.
2. **Global Latency Surface**: A 3D topographical map representing the overall typing speed and bottlenecks across the entire keyboard.

### Core Data Flow
Every keystroke generates an event: `{From Key, To Key, Latency (ms)}`.
These events are aggregated and transformed when the user enters "Diagnostics Mode" (e.g., by pressing Tab).

---

## 2. Data Processing Pipeline

```mermaid
flowchart TD
    %% Styling Definitions %%
    classDef step fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#f8fafc;
    classDef startend fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#f8fafc;

    Start([Input: Raw Keystroke Events]):::startend
    --> Step1["1. Filter Backspaces<br>Pop typos and ignore recovery transitions"]:::step
    --> Step2["2. Filter Outliers<br>Hard cutoff at 2000ms<br>Dynamic Log IQR cutoff for >1500 events (min 500ms)"]:::step
    --> Step3["3. Aggregate Pairs & Sigmoid<br>Scale latency to [0, 1] sigmoid<br>Calculate avg z and frequency per pair"]:::step
    --> Step4["4. Summarize Keys<br>Weighted average of incoming transitions<br>Total frequency = Confidence"]:::step
    --> Step5["5. Laplacian Smoothing<br>Delaunay triangulation graph<br>Interpolate low confidence keys with neighbors"]:::step
    --> End([Output: Final smoothed z and stdev per key]):::startend
```

### Pipeline Steps:
1. **Backspace Filtering**: Removes typos and the transition back to normal typing.
2. **Outlier Filtering**: Removes extreme pauses (e.g., > 2000ms) and applies dynamic IQR filtering if enough data exists.
3. **Pair Aggregation**: Averages the physical latency for each `From -> To` pair.
4. **Key Summarization**: Calculates a single representative latency value for each key based on the weighted average of its incoming transitions.
5. **Smoothing**: Uses Delaunay triangulation to construct an adjacency graph and applies Laplacian smoothing to fill in gaps for keys with low data confidence.

---

## 3. Key-Centric Vector Model (Cylindrical)

### Concept
Visualizes the relationship between a specific target key (**To Key**) and all keys pressed immediately before it (**From Keys**).

Each key has an independent 3D cylindrical coordinate system:
* **Origin**: The target key (To Key).
* **Vector $\vec{V}_{k} = (r, \theta, z)$**:
  * **$\theta$ (Direction)**: The identity of the From Key, spaced uniformly over 360°.
  * **$z$ (Height)**: The raw average latency (in ms, no sigmoid applied) of the transition.
  * **$r$ (Radius)**: The frequency of this specific key transition.

### UI Interaction
When a user clicks a key in Diagnostics Mode, the view morphs into this fan-like "flower" shape. It helps diagnose *why* a key is slow by highlighting specific incoming transitions that are causing bottlenecks.

---

## 4. Global Latency Surface

### Concept
A 3D topographical map constructed by compressing the vector data of all keys into single representative points and connecting them.

### Visual Representation
* **Flat plains**: Fast, consistent typing areas.
* **High peaks**: Areas where typing is slow or the user hesitates.
* **Uneven terrain**: Inconsistent typing rhythm.

### UI Interaction
This is the default view in Diagnostics Mode. It provides a macro-level overview of the user's typing bottlenecks before they drill down into specific keys using the Cylindrical view.
