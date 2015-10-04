// Initiate FB
function Facebook(accessToken) {
    this.fb = Meteor.npmRequire('fbgraph');
    console.log('Successful call to the Facebook Open Graph');
    this.accessToken = accessToken;
    this.fb.setAccessToken(this.accessToken);
    this.options = {
        timeout: 3000,
        pool: {maxSockets: Infinity},
        headers: {connection: "keep-alive"}
    }
    this.fb.setOptions(this.options);
}

Facebook.prototype.query = function(query, method) {
	console.log(query);
    var self = this;
    var method = (typeof method === 'undefined') ? 'get' : method;
    var data = Meteor.sync(function(done) {
        self.fb[method](query, function(err, res) {
            done(null, res);
        });
    });
    console.log("data::::: " + data.toString());
    console.log(data.result);
    return data.result;
}

Facebook.prototype.getUserData = function() {
    return this.query('me');
}

Facebook.prototype.getUserFriends = function() {
	console.log("finding friends");
    return this.query('me/friends');
}

Facebook.prototype.searchFB = function() {
    return this.query('search?type=user&q=Calvin+Wang');
}

Meteor.methods({
    getUserData: function() {
        var fb = new Facebook(Meteor.user().services.facebook.accessToken);
        var data = fb.getUserData();
        return data;
    }, 
    getUserFriends: function() {
        var fb = new Facebook(Meteor.user().services.facebook.accessToken);
        var data2 = fb.getUserFriends();
        return data2;
    },
    searchFB: function() {
        var fb = new Facebook(Meteor.user().services.facebook.accessToken);
        var result = fb.searchFB();
        return result;
    }
});