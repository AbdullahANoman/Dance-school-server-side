const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(
  "sk_test_51NFcq3J4bdzkJ4Z5kcZidpkFmtcTLRI0LgqgyE6BQtCKYm9wK02nkxlUJ3jGNdziEx1EBQ49xKRRjEE2RKQMz6tp00fQsH7VT4"
);
require("dotenv").config();
//middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// jwt verify

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r3tx4xp.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("Dance-School").collection("users");
    const classesCollection = client.db("Dance-School").collection("classes");
    const selectedCollection = client
      .db("Dance-School")
      .collection("selectedClass");
    const paymentCollection = client.db("Dance-School").collection("payments");
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    app.post("/classes", async (req, res) => {
      const body = req.body;
      const result = await classesCollection.insertOne(body);
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    app.get("/classes/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/student/:email",   async (req, res) => {
      const email = req.params.email;

      const item = req.body;
      item.userEmail = email;
      const result = await selectedCollection.insertOne(item);
      res.send(result);
    });

    app.get("/student/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };

      const result = await selectedCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/pay/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const findPaymentClass = await selectedCollection.find(query).toArray();
      res.send(findPaymentClass);
    });
    app.get("/enrolled/:email", async (req, res) => {
      const email = req.params.email;
      const query = { instructorEmail: email };

      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/student/:email/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await selectedCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/classes/status/approve/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approve",
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/classes/status/deny/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "deny",
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decoded = req.decoded;
      if (decoded?.email !== email) {
        res.send({ isAdmin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { Admin: user?.role == "admin" };
      res.send(result);
    });
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decoded = req.decoded;
      if (decoded?.email !== email) {
        res.send({ isInstructor: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { Instructor: user?.role == "instructor" };
      res.send(result);
    });
    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decoded = req.decoded;
      if (decoded?.email !== email) {
        res.send({ isStudent: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { Student: user?.role == "Student" };
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send([]);
      } else {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      }
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: `admin`,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: `instructor`,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // instructor page
    app.get("/instructor/:role", async (req, res) => {
      const instructorRole = req.params.role;
      console.log(instructorRole)
      const query = { role: instructorRole };

      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // feedback
    app.get("/feedback/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(id);
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/updateFeedback/:id", async (req, res) => {
      const id = req.params.id;
      const { feedBack } = req.body;
      // console.log(newFeedBack)
      // console.log(id,feedBack)

      const filter = { _id: new ObjectId(id) };

      // const existing = await classesCollection.find(query);

      const result = await classesCollection.updateOne(
        filter,
        { $set: { feedBack: feedBack } },
        { upsert: true }
      );

      res.send(result);
      // const query = { _id: new ObjectId(id) };
      // const existing = await classesCollection.find(query)
      // // const options = { upsert: true };
      // const doc = {
      //   feedBack
      // };
      // const result = await existing.insertOne(doc)
      // res.send(result);
    });
    // payments
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount);
      console.log(process.env.PAYMENT_STRIPE_KEY);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment related  api
    app.post("/payments/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      console.log(payment);
      const result = await paymentCollection.insertOne(payment);

      const query = {
        _id: new ObjectId(id),
      };
      const deleteResult = await selectedCollection.deleteOne(query);
      res.send({ result, deleteResult });
    });

    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
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
  res.send("Summer Camp is running");
});

app.listen(port, () => {
  console.log(`Summer Camp is running  on port ${port}`);
});
