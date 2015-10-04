Meteor.publish('tasks', function() {
    return Tasks.find();
});

Meteor.publish("user", function() { 
	return Meteor.users.find({_id: this.userId}, {fields: {'services.facebook.user_friends': 1}}); });