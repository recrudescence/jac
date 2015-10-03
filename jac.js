Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
  Meteor.subscribe("tasks");
  // This code only runs on the client
  Template.body.helpers({
    tasks: function () {
      // Show newest tasks at the top
      return Tasks.find({}, {sort: {dueDate: 1}});
    }
  });

  Template.body.events({
    "submit .new-task": function (event, template) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var elem = event.target;

      Meteor.call("addTask", elem);

      // Clear form
      template.find("form").reset();
    }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    }
  });
}

Meteor.methods({
  addTask: function (elem) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

      Tasks.insert({
        name: elem[0].value,
        startDate: elem[1].value,
        dueDate: elem[2].value,
        value: elem[3].value,
        notes: elem[4].value,
        createdAt: new Date(), // current time
        owner: Meteor.userId()
      });

  },
  deleteTask: function (taskId) {
    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    Tasks.update(taskId, { $set: { checked: setChecked} });
  }
});