Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
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

      // Insert a task into the collection
      Tasks.insert({
        name: elem[0].value,
        startDate: elem[1].value,
        dueDate: elem[2].value,
        value: elem[3].value,
        notes: elem[4].value,
        createdAt: new Date() // current time
      });

      // Clear form
      template.find("form").reset();
    }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Tasks.update(this._id, {
        $set: {checked: ! this.checked}
      });
    },
    "click .delete": function () {
      Tasks.remove(this._id);
    }
  });
}