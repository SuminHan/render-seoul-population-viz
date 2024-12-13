const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const turf = require('@turf/turf');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Load GeoJSON data
const bgdf = JSON.parse(fs.readFileSync('assets/population_grid_128x128_points_filtered.geojson'));

// Load CSV data
let popu_df = {};
fs.createReadStream('assets/population_grid_128x128_data_light.csv')
  .pipe(csvParser())
  .on('data', (row) => {
    const timestamp = moment(row.index, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DDTHH:mm:ss');
    delete row.index;
    const parsedRow = {};
    for (const [key, value] of Object.entries(row)) {
      parsedRow[key] = parseFloat(value);
    }
    popu_df[timestamp] = parsedRow;
  })
  .on('end', () => {
    console.log('CSV data loaded successfully.');
  });

// Routes
app.get('/living', (req, res) => {
  res.json(bgdf);
});

app.get('/data', (req, res) => {
  const ymd = req.query.ymd || '20170301';
  const hour = parseInt(req.query.hour || 9);

  const year = parseInt(ymd.slice(0, 4));
  const month = parseInt(ymd.slice(4, 6)) - 1; // JavaScript months are zero-indexed
  const day = parseInt(ymd.slice(6, 8));

  let mdate = moment({ year, month, day, hour: hour % 24 });
  if (hour >= 24) {
    mdate.add(1, 'days');
  }


  const timestamp = mdate.format('YYYY-MM-DDTHH:mm:ss');
  console.log(timestamp);
  const ldict = popu_df[timestamp] || {};

  res.json({ lte: ldict });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/population.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
