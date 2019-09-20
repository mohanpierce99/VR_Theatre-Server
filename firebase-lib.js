const firebase = require('firebase');
let db = null;
let u;
var friends = [];
var pendingreq = [];
var parties = [];

function filter(arr, friends) {
    return arr.filter((x) => {
        if (x.friends === friends) {
            return true;
        }
    })
};

const addFriend = (f) => {
    return new Promise((res, rej) => {
        db.collection("friends").doc().set({
            uid: u,
            fuid: f,
            status: false
        }).then(() => {
            res("Friend added successfully");
        }).catch((err) => rej(err));
    })
}

const rateMovie = async (arr) => {
    var batch = db.batch();
    for (data of arr) {
        batch.set(db.collection("ratings").doc(), {
            movieid: data.movieid,
            rating: data.rating,
            uid: u
        });
    }
    try {
        await batch.commit();
        return true;
    } catch {
        return false;
    }
    return true;
};

const createWatchParty = (arr, movieid, friends) => {
    return new Promise((res, rej) => {
        db.collection("watchparty").doc(u + movieid).set({
            movieid,
            invited: arr,
            initiator: u,
            friends
        }).then(() => {
            res(true);
        }).catch((err) => {
            rej(err);
        })
    });
}

const listenWatchParty = (callback, friends) => {
    db.collection("watchparty").where("invited", "array-contains", u).onSnapshot((snapshot) => {
        snapshot.forEach((doc) => {
            parties.push(doc.data());
        });
        if (friends) {
            callback(filter(parties, true));
        } else {
            callback(filter(parties, false));
        }
    })
}


const getPendingreq = (callback) => {
    var promisearr = [];

    db.collection("friends").where("fuid", "==", uid).where("status", "==", false).onSnapshot(function (qs) {
        qs.forEach((doc) => {
            promisearr.push(db.collection("users").where("uid", "==", doc.data().uid).get());
        });

        Promise.all(promisearr).then(res => {
            res.forEach((docs) => {
                pendingreq.push([docs.data(), docs.id]);
            });
            callback(pendingreq);
        })

    });
}

const acceptFriendreq = (friend) => {
    return new Promise((res, rej) => {
        db.collection("friends").where("uid", "==", u).where("fuid", "==",friend).get().then((docs) => {
            docs.forEach((docr) => {
                db.collection("friends").doc(docr.id).update({
                    status: true
                }).then(() => {
                    res(true);
                }).catch((err) => {
                    rej(err);
                })
            })
        })
    })
}
const getFriends=()=>{
    var payload={};
    return new Promise((res,rej)=>{
       db.collection("friends").where("uid","==",u).get().then((qs)=>{
           qs.docs.forEach((doc,i,arr)=>{
               payload.status=doc.data().status;
               db.collection("users").doc(doc.id).get().then((d)=>{
                   d.docs
               })
           })
       })
    });
}

const listenFriends=(cl)=>{
    var initialState=true;
    db.collection("friends").where("uid", "==", u)
    .onSnapshot(function (querySnapshot) {
        if(initialState){
            initialState=false;
            return;
        }
        let docs=querySnapshot.docs[0];
        cl(docs.data());
    })
};

const listenUser=(arr,cl)=>{
    var initialState=true;
    db.collection("users").onSnapshot((qs)=>{
        if(initialState){
            initialState=false;
            return ;
        }
        qs.docChanges().forEach(function(change) {
      
            if (change.type === "modified") {
                 cl(change.doc.data());
            }
        });
    })
};

const getFriends = (callback) => {
    var switcher = false;
    db.collection("friends").where("uid", "==", u)
        .onSnapshot(function (querySnapshot) {
            switcher = true;
            querySnapshot.docs.forEach(function (doc, i,arr) {
                db.collection("users").doc(doc.data().fuid).onSnapshot((docs) => {
                    friends = friends.filter(x => {
                        return x[1] != docs.id
                    }) || [];
                    friends.push([docs.data(), docs.id]);
                    console.log(switcher);
                    console.log(querySnapshot.docs.length,i);
                    if (!switcher)
                        callback(friends);
                    if (switcher) {
                        if (arr.length == i+1) {
                            callback(friends);
                            switcher = false;
                        }
                    }
                });

            });
        });
}

const search=(frname,page,callback)=>{
        db.collection("users").where("name","==",frname).limit(5*page).get().then((snap)=>{
            var myarr=[];
            snap.forEach((doc)=>{
                myarr.push(doc.data());
            });
            myarr.slice(page*5-4,page*5+1);
            callback(myarr);  
        });
}


const init = (config, uid) => {
    firebase.initializeApp(config);
    db = firebase.firestore();
    u = uid;
    return {
        getFriends,search,addFriend,acceptFriendreq,listenFriends,listenUser
    }
}

module.exports = init;