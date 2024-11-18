const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); // Import ObjectId
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

console.log(process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.at16f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const toyCollection = client.db("toyHouse").collection("toys");

    // Get all toys (for testing purposes, not used in "My Toys" page)
    app.get("/toys", async (req, res) => {
      const cursor = toyCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get toys added by a specific user (filtered by seller email)
    app.get("/my-toys", async (req, res) => {
      const { email } = req.query; // User's email from the query parameter
      
      // Handle missing email query
      if (!email) {
        return res.status(400).json({ error: "User email is required." });
      }
    
      try {
        const query = { sellerEmail: email }; // Filter toys by seller's email
        const toys = await toyCollection.find(query).toArray();
    
        // If no toys are found, respond with a proper message
        if (toys.length === 0) {
          return res.status(404).json({ message: "No toys found for this user." });
        }
    
        res.json(toys);
      } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).json({ error: "Failed to fetch toys." });
      }
    });
    

    // Get a single toy by ID
    app.get("/toys/:id", async (req, res) => {
      const id = req.params.id;

      // Check if the id is a valid ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid toy ID format" });
      }

      const query = { _id: new ObjectId(id) };

      const options = {
        projection: {
          pictureUrl: 1,
          name: 1,
          sellerName: 1,
          sellerEmail: 1,
          price: 1,
          rating: 1,
          availableQuantity: 1,
          detailDescription: 1,
        },
      };

      const result = await toyCollection.findOne(query, options);

      if (!result) {
        return res.status(404).send({ error: "Toy not found" });
      }

      res.send(result);
    });

    // Add a new toy to the collection
    app.post("/toys", async (req, res) => {
      const newToy = req.body;

      // Ensure all required fields are provided
      const {
        pictureUrl,
        name,
        sellerName,
        sellerEmail,
        subCategory,
        price,
        rating,
        availableQuantity,
        detailDescription,
      } = newToy;

      if (
        !pictureUrl ||
        !name ||
        !sellerName ||
        !sellerEmail ||
        !subCategory ||
        !price ||
        !rating ||
        !availableQuantity ||
        !detailDescription
      ) {
        return res.status(400).send({ error: "All fields are required." });
      }

      try {
        const result = await toyCollection.insertOne(newToy);
        res.status(201).send({
          message: "Toy added successfully",
          toyId: result.insertedId,
        });
      } catch (error) {
        console.error("Error inserting toy:", error);
        res.status(500).send({ error: "Failed to add toy." });
      }
    });

    // Update toy details by ID
    app.put("/toys/:id", async (req, res) => {
      const id = req.params.id;
      const updatedToy = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid toy ID format" });
      }

      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          price: updatedToy.price,
          availableQuantity: updatedToy.availableQuantity,
          detailDescription: updatedToy.detailDescription,
        },
      };

      try {
        const result = await toyCollection.updateOne(query, updateDoc);
        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ error: "Toy not found or not updated" });
        }
        res.send({ message: "Toy updated successfully", result });
      } catch (error) {
        console.error("Error updating toy:", error);
        res.status(500).send({ error: "Failed to update toy." });
      }
    });

    // Delete a toy by ID
    app.delete("/toys/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid toy ID format" });
      }

      const query = { _id: new ObjectId(id) };
      try {
        const result = await toyCollection.deleteOne(query);
        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "Toy not found" });
        }
        res.send({ message: "Toy deleted successfully", result });
      } catch (error) {
        console.error("Error deleting toy:", error);
        res.status(500).send({ error: "Failed to delete toy." });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Toy House is running");
});

app.listen(port, () => {
  console.log(`Toy House server is running on port ${port}`);
});
