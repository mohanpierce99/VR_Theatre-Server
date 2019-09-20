var bodyparser = require("body-parser");
var express = require("express");
var firebase = require("firebase");
var fri = true;
var search=[];

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

function filter(arr, uid) {
    return arr.filter((x) => {
        if (x.uid == uid) {
            return false;
        } else {
            return true;
        };
    })
}

function transform(arr) {
    search=[];
    var count=0;
    var user = arr.map((d,i) => {
       d.uid=d.uid.replace(/\s+/g,"");
        let uid=null;
        let dom=search.filter(x=>x[d.uid]!=undefined)
        if(dom.length!=0){
           uid=dom[0][d.uid];
        }else{
            var obj={};
            obj[d.uid]=i;
            obj["uid"]=d.uid;
            obj["index"]=i;
            obj["count"]=count++;
            search.push(obj);
            uid=i;
        }
        return [uid,+d.movieid, +d.rating];
    });

    var movies = arr.map((x,i) => {
        return [i,i];
    });
    var obj = {
        movies,
        "userratings": user
    };
    console.log("vhgfygf");
    console.log(obj);
    return obj;
}

function router() {
    let ratingdb = [];
    let db = firebase.firestore();

    db.collection("users").onSnapshot((qs) => {
        var promisearr = [];

        qs.docChanges().forEach(function (change) {
            let payload = change.doc.data();
            if (payload.onlineStatus) {
                promisearr.push(db.collection("ratings").where("uid", "==", change.doc.id).get());
            } else {
                ratingdb = filter(ratingdb, change.doc.id);
            };
        });
        if (promisearr.length) {
            Promise.all(promisearr).then((responses) => {
                responses.forEach((qs) => {
                    qs.forEach((doc) => {
                        ratingdb.push({
                            uid: doc.data().uid,
                            movieid: doc.data().movieid,
                            rating: doc.data().rating
                        });
                    })
                });
                console.log(">>----");
                console.log(transform(ratingdb));
                fetch('http://127.0.0.1:5000/train', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(transform(ratingdb))
                });
             
            });
        } else {
            console.log("----------");
            console.log(transform(ratingdb));

            fetch('http://127.0.0.1:5000/train', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transform(ratingdb))
            });        }


    });

    db.collection("ratings").onSnapshot((snapshot) => {
        var dc = false;
        if (fri) {
            dc = true;
            fri = false;
        };
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
                fetch('http://127.0.0.1:5000/train', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(transform(ratingdb))
                });            }
        });
    });


    app.use(bodyparser.urlencoded({
        extended: true
    }));

    app.use(bodyparser.json());

    app.get("/", (req, res) => {
        res.send("hello world");
    });

    app.get("/suggest", (req, res) => {
        console.log("hit");
        let uid = req.query.uid;
        let id=search.filter(x=>x.uid==uid)[0].count;
        console.log(id);
        fetch('http://127.0.0.1:5000/getResult', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({usertopred:id})
        }).then((response) => {
            console.log("hit");
            response.json().then(x=>{
    
             x=x.map((l,i)=>{return {index:i,uid:ratingdb[search.filter(p=>p.count==i)[0].index].uid,value:l}}).filter(o=>o.count!=id).sort((x,y)=>x.value>y.value).slice(0,5).map(x=>x.uid);
            res.json(x);
            });
        })
    });


    app.get("/upload", (req, res) => {
        var i = 4;
        var batch = db.batch();
        payload = [
            ["Justice league", "https://images-na.ssl-images-amazon.com/images/I/A11dMzZO3dL._SL1500_.jpg"],
            ["Jurasic park", "https://movieposters2.com/images/629895-b.jpg"],
            ["Inception", "https://images-na.ssl-images-amazon.com/images/I/51bDICODpZL.jpg"],
            ["The Matrix", "https://d1w8cc2yygc27j.cloudfront.net/3650934877003789387/458584423330588902.jpg"],
            ["Saving Private Ryan", "https://cdn.shopify.com/s/files/1/0747/3829/products/HP2465_bebe16f0-653b-41ad-91b0-c92b20398f1b_1024x1024.jpg?v=1515503734"],
            ["Dunkirk", "https://images-na.ssl-images-amazon.com/images/I/91a9Ez60pmL._SY606_.jpg"],
            ["Infinity war", "https://i.redd.it/pqoiixj0b3r01.jpg"],
            ["End game", "https://images-na.ssl-images-amazon.com/images/I/81o%2BzjZ4KHL._SY679_.jpg"],
            ["Finding nemo", "https://fffmovieposters.com/wp-content/uploads/73762.jpg"],
            ["Spiderman homecoming", "https://j.b5z.net/i/u/6127364/i/ec/spider5778_i2.jpg"],
            ["Ironman", "https://live.staticflickr.com/4088/4847356643_76ae05a46e_b.jpg"],
            ["Titanic", "https://images-na.ssl-images-amazon.com/images/I/51gEpO63aRL.jpg"],
            ["Momento", "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzbY7kb_TgwKXKNvE2bd2-s4z48JREFVX0X6h6LxDF6JOLUrvueQ"],
            ["Toy story", "https://images-na.ssl-images-amazon.com/images/I/514IG81HAhL.jpg"],
            ["Jurassic World", "https://images-na.ssl-images-amazon.com/images/I/817O-vUusjL._SL1500_.jpg"],
            ["Rush", "https://cdn.europosters.eu/image/1300/posters/rush-movie-poster-i18511.jpg"]
        ];

        payload.forEach((x) => {
            let l = {
                name: x[0],
                photo: x[1]
            };
            batch.set(db.collection("movies").doc(i + ""), l);
            i += 1;
        });

        batch.commit().then(() => {
            res.send("successfully added");
        });

    });



    return app;
}


module.exports = router;