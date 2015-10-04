Meteor.publish('tasks', function() {
    return Tasks.find();
});

Meteor.publish('userData', function() {
	if (!this.userId) {
		return null;
	}
	else {
		return Meteor.users.find({_id: this.userId}, {fields: {
			balance: 1,
			'tasks': 1,
			friends: 1,
			temp: 1,
			'overdueTasks': 1,
			'services.facebook': 1
		}});
	}
});
