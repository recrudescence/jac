Meteor.publish('tasks', function() {
    return Tasks.find();
});

Meteor.publish('userData', function() {
	if (!this.userId) {
		return null;
	}
	return Meteor.users.find(this.userId, {fields: {
		debt: 1,
		tasks: 1,
		overdueTasks: 1,
		services.facebook.user_friends: 1,
	}})
});
