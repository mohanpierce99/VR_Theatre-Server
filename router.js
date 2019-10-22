var bodyparser = require("body-parser");
``;
var express = require("express");
var firebase = require("firebase");
var fri = true;
var search = [];
let lookup = {};

// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyDxUdsBOiWl41ASEHweGZdhdCZtXDvPOg8",
  authDomain: "vr-theatre.firebaseapp.com",
  databaseURL: "https://vr-theatre.firebaseio.com",
  projectId: "vr-theatre",
  storageBucket: "",
  messagingSenderId: "69732209271",
  appId: "1:69732209271:web:72b6bf3a671d3b8f43ec72"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

var app = express.Router();
var axios = require("axios");
var db = firebase.firestore();

function filter(arr, uid) {
  return arr.filter(x => {
    if (x.uid == uid) {
      return false;
    } else {
      return true;
    }
  });
}

function transform(arr) {
  search = [];
  var count = 0;
  var user = arr.map((d, i) => {
    d.uid = d.uid.replace(/\s+/g, "");
    let uid = null;
    let dom = search.filter(x => x[d.uid] != undefined);
    if (dom.length != 0) {
      uid = dom[0][d.uid];
    } else {
      lookup[count] = i;
      var obj = {};
      obj[d.uid] = i;
      obj["uid"] = d.uid;
      obj["index"] = i;
      obj["count"] = count++;
      search.push(obj);
      uid = i;
    }
    return [uid, +d.movieid, +d.rating];
  });
  let mod = user.map(x => {
    let y = Object.entries(lookup);
    let match = y.filter((z) => {
      return z[1] == x[0]
    });
    x[0] = +match[0][0];

    return x;
  });

  var obj = {
    userratings: mod
  };
  console.log("vhgfygf");
  console.log(obj);
  return obj;
}

function getMovies() {
  return new Promise((res, rej) => {
    db.collection("movies")
      .get()
      .then(qs => {
        let len = qs.docs.length;
        var surr = [];
        for (let i = 0; i < len; i++) {
          let arr = [i, i];
          surr.push(arr);
        }
        res(surr);
      });
  });
}

function router() {
  let ratingdb = [];

  db.collection("users").onSnapshot(qs => {
    var promisearr = [];

    qs.docChanges().forEach(function (change) {
      let payload = change.doc.data();
      if (payload.onlineStatus) {
        promisearr.push(
          db
          .collection("ratings")
          .where("uid", "==", change.doc.id)
          .get()
        );
        console.log("hey");
      } else {
        ratingdb = filter(ratingdb, change.doc.id);
      }
    });

    if (promisearr.length) {
      Promise.all(promisearr).then(responses => {
        responses.forEach(qs => {
          qs.forEach(doc => {
            ratingdb.push({
              uid: doc.data().uid,
              movieid: doc.data().movieid,
              rating: doc.data().rating
            });
          });
        });
        console.log(">>----");
        getMovies().then(data => {
          let obj = transform(ratingdb);
          console.log(data, "movies");
          obj.movies = data;
          fetch("http://127.0.0.1:5000/train", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(obj)
          });
        });
      });
    } else {
      console.log("----------");
      console.log(transform(ratingdb));
      getMovies().then(data => {
        let obj = transform(ratingdb);
        console.log(data, "movies");
        obj.movies = data;
        fetch("http://127.0.0.1:5000/train", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(obj)
        });
      });
    }
  });

  db.collection("ratings").onSnapshot(snapshot => {
    var dc = false;
    if (fri) {
      dc = true;
      fri = false;
    }
    snapshot.docChanges().forEach(function (change) {
      if (dc) {
        return;
      }
      if (change.type === "added") {
        let newchange = change.doc.data();
        ratingdb.push({
          uid: newchange.uid,
          movieid: newchange.movieid,
          rating: newchange.rating
        });
        console.log(transform(ratingdb));
        getMovies().then(data => {
          let obj = transform(ratingdb);
          console.log(data, "movies");
          obj.movies = data;
          fetch("http://127.0.0.1:5000/train", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(obj)
          });
        });
      }
    });
  });

  app.use(
    bodyparser.urlencoded({
      extended: true
    })
  );

  app.use(bodyparser.json());

  app.get("/", (req, res) => {
    res.send("hello world");
  });

  app.get("/suggest", (req, res) => {
    console.log("hit");
    let uid = req.query.uid;
    console.log(uid);
    console.log(search);
    let id = search.filter(x => x.uid == uid)[0].count;
    console.log(id);
    fetch("http://127.0.0.1:5000/getResult", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        usertopred: id
      })
    }).then(response => {
      console.log("hit");
      response.json().then(x => {
        x = x
          .map((l, i) => {
            lookup = lookup;
            return {
              index: i,
              uid: ratingdb[lookup[i]].uid,
              value: l
            };
          })
          .sort((x, y) => x.value > y.value)
          .slice(0, 5)
          .map(x => x.uid)
          .filter(x => x != uid);
        res.json(x);
      });
    });
  });
  return app;
}

module.exports = router;