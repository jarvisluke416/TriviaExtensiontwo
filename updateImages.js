import fs from 'fs';
import axios from 'axios';

// Path to your JSON file
const jsonFilePath = 'C:/Users/jarvi/Dev/TriviaExtensiontwo/trivia-extension/public/streetArtistData.json';

// Function to fetch the Wikipedia image for an artist
async function fetchWikipediaImage(artistName) {
    const endpoint = `https://en.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(artistName)}&prop=pageimages&piprop=original`;

    try {
        const response = await axios.get(endpoint);
        const pages = response.data.query.pages;

        // Extract the first page data
        const page = Object.values(pages)[0];

        if (page.original) {
            console.log(`Image found for ${artistName}: ${page.original.source}`);
            return page.original.source;
        } else {
            console.log(`No image found for ${artistName}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching image for ${artistName}:`, error);
        return null;
    }
}

// Function to update the JSON file with images
async function updateJsonWithImages() {
    try {
        // Read the current JSON file
        console.log(`Reading file: ${jsonFilePath}`);
        const rawData = fs.readFileSync(jsonFilePath, 'utf-8');
        const data = JSON.parse(rawData);

        // Loop through the artists and fetch their Wikipedia images
        for (let artist of data) {
            const artistName = artist.correctAnswer;  // Use 'correctAnswer' instead of 'name'
            
            if (artistName) {  // Ensure there's a name (correctAnswer) property
                console.log(`Fetching image for artist: ${artistName}`);
                const imageUrl = await fetchWikipediaImage(artistName);
                if (imageUrl) {
                    artist.imageUrl = imageUrl;  // Add the image URL to the artist object
                }
            } else {
                console.log('Artist missing correctAnswer, skipping...');
            }
        }

        // Write the updated data back to the original JSON file
        console.log('Writing updated data back to the file...');
        fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2));

        console.log('Updated JSON file with images.');
    } catch (error) {
        console.error('Error reading or writing the JSON file:', error);
    }
}

// Execute the update function
updateJsonWithImages();
