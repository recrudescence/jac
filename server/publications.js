Meteor.publish('tasks', function() {
    return Tasks.find();
});

Meteor.publish('people', function() {
	return People.find();
});
