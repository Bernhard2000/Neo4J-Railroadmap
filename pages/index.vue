<template>
  <div>
    <h1>Neo4j Data Viewer</h1>

    <section>
      <h2>Station Map</h2>
      <div id="map" style="height: 600px; width: 100%"></div>
    </section>

    <Panel header="Existing Stations" :toggleable="true">
      <p v-if="pending">Loading stations...</p>
      <p v-else-if="error">Error: {{ error.message }}</p>
      <div v-else class="station-list-container">
        <ul>
          <li v-for="(station, index) in stations" :key="index">
            {{ station.name }} ({{ station.latitude }}, {{ station.longitude }})
            <div class="button-group">
              <Button
                label="Edit"
                class="p-button-rounded p-button-text p-button-sm"
                @click="openEditStationDialog(station)"
              />
              <Button
                label="Delete"
                class="p-button-rounded p-button-text p-button-sm p-button-danger"
                @click="confirmDeleteStation(station)"
              />
            </div>
          </li>
        </ul>
      </div>
    </Panel>

    <!-- Edit Station Dialog -->
    <Dialog
      v-model:visible="displayEditStationDialog"
      header="Edit Station"
      :modal="true"
      class="p-fluid"
    >
      <div class="p-field">
        <label for="editStationName">Station Name:</label>
        <input id="editStationName" v-model="selectedStation.name" type="text" required />
      </div>
      <div class="p-field">
        <label for="editStationLatitude">Latitude:</label>
        <input
          id="editStationLatitude"
          v-model.number="selectedStation.latitude"
          type="number"
          step="any"
        />
      </div>
      <div class="p-field">
        <label for="editStationLongitude">Longitude:</label>
        <input
          id="editStationLongitude"
          v-model.number="selectedStation.longitude"
          type="number"
          step="any"
        />
      </div>
      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="displayEditStationDialog = false"
        />
        <Button label="Save" icon="pi pi-check" @click="saveEditedStation" />
      </template>
    </Dialog>

    <!-- Delete Station Dialog -->
    <Dialog
      v-model:visible="displayDeleteStationDialog"
      header="Delete Station"
      :modal="true"
      class="p-fluid"
    >
      <div class="p-field">
        <p>
          Are you sure you want to delete station "<strong>{{
            stationToDelete.name
          }}</strong
          >"? This will also delete all connected rail lines.
        </p>
      </div>
      <template #footer>
        <Button
          label="Abort"
          icon="pi pi-times"
          class="p-button-text"
          @click="displayDeleteStationDialog = false"
        />
        <Button
          label="OK"
          icon="pi pi-check"
          class="p-button-danger"
          @click="deleteSelectedStation"
        />
      </template>
    </Dialog>

    <Panel header="Existing Rail Lines" :toggleable="true">
      <p v-if="pending">Loading rail lines...</p>
      <p v-else-if="error">Error: {{ error.message }}</p>
      <div v-else class="station-list-container">
        <ul>
          <li v-for="(relationship, index) in relationships" :key="index">
            {{ relationship.sourceName }} --({{ relationship.distance }} km)
            {{ relationship.targetName }}
            <div class="button-group">
              <Button
                label="Edit"
                class="p-button-rounded p-button-text p-button-sm"
                @click="openEditConnectionDialog(relationship)"
              />
              <Button
                label="Delete"
                class="p-button-rounded p-button-text p-button-sm p-button-danger"
                @click="confirmDeleteConnection(relationship)"
              />
            </div>
          </li>
        </ul>
      </div>
    </Panel>

    <!-- Edit Connection Dialog -->
    <Dialog
      v-model:visible="displayEditConnectionDialog"
      header="Edit Rail Line"
      :modal="true"
      class="p-fluid"
    >
      <div class="p-field">
        <label for="editSourceNodeName">Source Station:</label>
        <Select
          id="editSourceNodeName"
          v-model="selectedConnection.newSourceNodeName"
          :options="stations"
          optionLabel="name"
          placeholder="Select a Station"
          :editable="true"
          :showClear="true"
          required
        />
      </div>
      <div class="p-field">
        <label for="editTargetNodeName">Target Station:</label>
        <Select
          id="editTargetNodeName"
          v-model="selectedConnection.newTargetNodeName"
          :options="stations"
          optionLabel="name"
          placeholder="Select a Station"
          :editable="true"
          :showClear="true"
          required
        />
      </div>
      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="displayEditConnectionDialog = false"
        />
        <Button label="Save" icon="pi pi-check" @click="saveEditedConnection" />
      </template>
    </Dialog>

    <!-- Delete Connection Dialog -->
    <Dialog
      v-model:visible="displayDeleteConnectionDialog"
      header="Delete Rail Line"
      :modal="true"
      class="p-fluid"
    >
      <div class="p-field">
        <p>Are you sure you want to delete the rail line between:</p>
        <p>
          <strong>Source Station:</strong> {{ connectionToDelete.sourceNodeName?.name }}
        </p>
        <p>
          <strong>Target Station:</strong> {{ connectionToDelete.targetNodeName?.name }}
        </p>
      </div>
      <template #footer>
        <Button
          label="Abort"
          icon="pi pi-times"
          class="p-button-text"
          @click="displayDeleteConnectionDialog = false"
        />
        <Button
          label="OK"
          icon="pi pi-check"
          class="p-button-danger"
          @click="deleteSelectedConnection"
        />
      </template>
    </Dialog>

    <Panel header="Insert New Station" :toggleable="true">
      <form @submit.prevent="addNode">
        <div>
          <label for="nodeName">Station Name:</label>
          <input id="nodeName" v-model="newNode.name" type="text" required />
        </div>
        <div>
          <label for="nodeCity">City:</label>
        </div>
        <div>
          <label for="nodeLatitude">Latitude:</label>
          <input
            id="nodeLatitude"
            v-model.number="newNode.latitude"
            type="number"
            step="any"
          />
        </div>
        <div>
          <label for="nodeLongitude">Longitude:</label>
          <input
            id="nodeLongitude"
            v-model.number="newNode.longitude"
            type="number"
            step="any"
          />
        </div>
        <button type="submit">Add Station</button>
      </form>
    </Panel>

    <Panel header="Create New Rail Line" :toggleable="true">
      <form @submit.prevent="addRelationship">
        <div>
          <label for="sourceNodeName">Source Station:</label>
          <Select
            id="sourceNodeName"
            v-model="newRelationship.sourceNodeName"
            :options="stations"
            optionLabel="name"
            placeholder="Select a Station"
            :editable="true"
            :showClear="true"
            required
          />
        </div>
        <div>
          <label for="targetNodeName">Target Station:</label>
          <Select
            id="targetNodeName"
            v-model="newRelationship.targetNodeName"
            :options="stations"
            optionLabel="name"
            placeholder="Select a Station"
            :editable="true"
            :showClear="true"
            required
          />
        </div>
        <button type="submit">Create Rail Line</button>
      </form>
    </Panel>
  </div>
</template>

<script setup>
import { ref, reactive, toRaw, computed, onMounted, onUnmounted, watch } from "vue";
import Select from "primevue/select";
import Panel from "primevue/panel";
import Dialog from "primevue/dialog"; // Import Dialog
import Button from "primevue/button"; // Import Button

const { data, pending, error, refresh } = await useFetch("/api/data");
const stations = computed(() => data.value?.stations || []);
const relationships = computed(() => data.value?.relationships || []);

// Reactive variables for editing station
const displayEditStationDialog = ref(false);
const selectedStation = reactive({
  originalName: "",
  name: "",
  latitude: null,
  longitude: null,
});

// Reactive variables for deleting station
const displayDeleteStationDialog = ref(false);
const stationToDelete = reactive({
  name: "",
});

// Reactive variables for editing connection
const displayEditConnectionDialog = ref(false);
const selectedConnection = reactive({
  originalSourceNodeName: "",
  originalTargetNodeName: "",
  newSourceNodeName: "",
  newTargetNodeName: "",
});

// Reactive variables for deleting connection
const displayDeleteConnectionDialog = ref(false);
const connectionToDelete = reactive({
  sourceNodeName: "",
  targetNodeName: "",
});

const newNode = reactive({
  name: "",
  city: "",
  latitude: null,
  longitude: null,
});

const newRelationship = reactive({
  sourceNodeName: "",
  relationshipType: "CONNECTS", // Hardcode relationship type for rail lines
  targetNodeName: "",
  distance: null, // Add distance property for relationships
});

// Map related variables
let map = null;
let selectedMarker = null;
let LeafletInstance = null;
let railLinesLayerGroup = null; // Layer group for rail lines

onMounted(async () => {
  LeafletInstance = await import("leaflet"); // Assign imported Leaflet to LeafletInstance
  // Initialize map
  map = LeafletInstance.map("map").setView([48.2082, 16.3738], 13); // Centered on Vienna, Austria

  LeafletInstance.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Handle map clicks to select coordinates
  map.on("click", (e) => {
    const { lat, lng } = e.latlng;
    newNode.latitude = lat;
    newNode.longitude = lng;

    // Remove existing marker if any
    if (selectedMarker) {
      map.removeLayer(selectedMarker);
    }

    // Add new marker
    selectedMarker = LeafletInstance.marker([lat, lng])
      .addTo(map)
      .bindPopup(`Selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      .openPopup();
  });

  // Add existing station markers
  addStationMarkers(stations.value, LeafletInstance);

  // Initialize layer group for rail lines
  railLinesLayerGroup = LeafletInstance.layerGroup().addTo(map);

  // Draw initial rail lines
  drawRailLines(relationships.value, LeafletInstance);
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

watch(
  [stations, relationships], // Watch both stations and relationships
  ([newStations, newRelationships]) => {
    if (map && LeafletInstance) {
      addStationMarkers(newStations, LeafletInstance);
      drawRailLines(newRelationships, LeafletInstance);
    }
  },
  { deep: true }
);

function addStationMarkers(stationsToAdd, LeafletInstance) {
  // Clear existing station markers (if any, not including selectedMarker)
  map.eachLayer((layer) => {
    if (layer instanceof LeafletInstance.Marker && layer !== selectedMarker) {
      map.removeLayer(layer);
    }
  });

  stationsToAdd.forEach((station) => {
    if (station.latitude && station.longitude) {
      LeafletInstance.marker([station.latitude, station.longitude])
        .addTo(map)
        .bindPopup(
          `<b>${station.name}</b><br>Lat: ${station.latitude}, Lng: ${station.longitude}`
        );
    }
  });
}

function drawRailLines(relationshipsToDraw, LeafletInstance) {
  if (railLinesLayerGroup) {
    railLinesLayerGroup.clearLayers(); // Clear existing lines
  }

  relationshipsToDraw.forEach((rel) => {
    if (rel.sourceLat && rel.sourceLng && rel.targetLat && rel.targetLng) {
      const latlngs = [
        [rel.sourceLat, rel.sourceLng],
        [rel.targetLat, rel.targetLng],
      ];
      LeafletInstance.polyline(latlngs, { color: "blue", weight: 3 })
        .bindPopup(
          `Rail Line: ${rel.sourceName} to ${rel.targetName} (${rel.distance} km)`
        )
        .addTo(railLinesLayerGroup);
    }
  });
}

async function addNode() {
  try {
    await $fetch("/api/data", {
      method: "POST",
      body: {
        name: newNode.name,
        latitude: newNode.latitude,
        longitude: newNode.longitude,
      },
    });
    alert("Node added successfully!");
    // Clear form
    newNode.name = "";
    newNode.latitude = null;
    newNode.longitude = null;
    if (selectedMarker) {
      map.removeLayer(selectedMarker);
      selectedMarker = null;
    }
    refresh(); // Refresh the list of stations and update map markers
  } catch (e) {
    alert("Error adding node: " + e.message);
  }
}

async function addRelationship() {
  try {
    await $fetch("/api/relationship", {
      method: "POST",
      body: {
        sourceNodeName: newRelationship.sourceNodeName.name, // Extract name from object
        relationshipType: newRelationship.relationshipType,
        targetNodeName: newRelationship.targetNodeName.name, // Extract name from object
        distance: newRelationship.distance, // Ensure distance is sent
      },
    });
    alert("Relationship created successfully!");
    // Clear form
    newRelationship.sourceNodeName = "";
    newRelationship.targetNodeName = "";
    newRelationship.distance = null;
    refresh(); // Refresh the list of nodes (to see updated graph if applicable)
  } catch (e) {
    alert("Error creating relationship: " + e.message);
  }
}

function openEditStationDialog(station) {
  selectedStation.originalName = station.name;
  selectedStation.name = station.name;
  selectedStation.latitude = station.latitude;
  selectedStation.longitude = station.longitude;
  displayEditStationDialog.value = true;
}

async function saveEditedStation() {
  try {
    await $fetch("/api/station.put", {
      method: "PUT",
      body: toRaw(selectedStation),
    });
    alert("Station updated successfully!");
    displayEditStationDialog.value = false;
    refresh(); // Refresh the list of stations and update map markers
  } catch (e) {
    alert("Error updating station: " + e.message);
  }
}

function confirmDeleteStation(station) {
  stationToDelete.name = station.name;
  displayDeleteStationDialog.value = true;
}

async function deleteSelectedStation() {
  try {
    await $fetch("/api/station.delete", {
      method: "DELETE",
      body: { name: stationToDelete.name },
    });
    alert("Station deleted successfully!");
    displayDeleteStationDialog.value = false;
    refresh(); // Refresh the list of stations and update map markers
  } catch (e) {
    alert("Error deleting station: " + e.message);
  }
}

function openEditConnectionDialog(relationship) {
  selectedConnection.originalSourceNodeName = relationship.sourceName;
  selectedConnection.originalTargetNodeName = relationship.targetName;
  selectedConnection.newSourceNodeName = stations.value.find(
    (s) => s.name === relationship.sourceName
  );
  selectedConnection.newTargetNodeName = stations.value.find(
    (s) => s.name === relationship.targetName
  );
  displayEditConnectionDialog.value = true;
}

async function saveEditedConnection() {
  try {
    await $fetch("/api/connection.put", {
      method: "PUT",
      body: {
        originalSourceNodeName: selectedConnection.originalSourceNodeName,
        originalTargetNodeName: selectedConnection.originalTargetNodeName,
        newSourceNodeName: selectedConnection.newSourceNodeName.name,
        newTargetNodeName: selectedConnection.newTargetNodeName.name,
      },
    });
    alert("Connection updated successfully!");
    displayEditConnectionDialog.value = false;
    refresh(); // Refresh the list of relationships and update map lines
  } catch (e) {
    alert("Error updating connection: " + e.message);
  }
}

async function confirmDeleteConnection(relationship) {
  connectionToDelete.sourceNodeName = stations.value.find(
    (s) => s.name === relationship.sourceName
  );
  connectionToDelete.targetNodeName = stations.value.find(
    (s) => s.name === relationship.targetName
  );
  displayDeleteConnectionDialog.value = true;
}

async function deleteSelectedConnection() {
  try {
    await useFetch("/api/connection", {
      method: "DELETE",
      body: {
        sourceNodeName: connectionToDelete.sourceNodeName.name,
        targetNodeName: connectionToDelete.targetNodeName.name,
      },
    });
    alert("Connection deleted successfully!");
    displayDeleteConnectionDialog.value = false;
    refresh(); // Refresh the list of relationships and update map lines
  } catch (e) {
    alert("Error deleting connection: " + e.message);
  }
}
</script>

<style>
body {
  font-family: sans-serif;
  margin: 20px;
  background-color: #f4f4f4;
  color: #333;
}

h1 {
  color: #0056b3;
}

form div {
  margin-bottom: 10px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input[type="text"],
input[type="number"] {
  width: calc(100% - 22px);
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background-color: #007bff;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #0056b3;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  background-color: #e9ecef;
  margin-bottom: 10px;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.station-list-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd; /* Optional: add a border to visualize the scrollable area */
  padding: 10px;
  border-radius: 4px;
}

.button-group {
  margin-left: auto;
}
</style>
