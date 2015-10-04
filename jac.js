Tasks = new Mongo.Collection("tasks");

if (Meteor.isServer) {

  Accounts.onCreateUser(function(options, user) {
    user.tasks = [];
    user.overdueTasks = [];
    user.debt = 0;
    if(options.profile) {
      user.profile = options.profile;
    }
    return user;
  });

}

if (Meteor.isClient) {
  Meteor.subscribe("tasks");
  Meteor.subscribe("userData");
  // This code only runs on the client
  Template.body.helpers({
    tasks: function () {
      // Show newest tasks at the top

    /*
      Meteor.users.find({_id: Meteor.userId()}, {tasks: 1, _id: 0}, function(err, collection) {
        collection.toArray(function(err, items) {
          console.log(items);
          return items;
        });
      });
  
  */
      var result = Meteor.users.find({_id: Meteor.userId()}, {tasks: 1, _id: 0}).fetch();
      console.log(result[0].tasks);

      return Tasks.find({'_id': {'$in': result[0].tasks}}, {sort: {completed: false, dueDate: 1}});

/*
          Tasks.find({'_id': {'$in': tasks}}, {sort: {completed: false, dueDate: 1}});
          */
        
      /*
      console.log(userTasks);
      return Tasks.find({'_id': {'$in': userTasks}}, {sort: {completed: false, dueDate: 1}});
      */
    }
  });

  Template.body.events({
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var elem = event.target;

      Meteor.call("addTask", elem);
    },

    "click #add": function(e) {
      e.preventDefault();

      $(':input:not(:button)', $('#taskModal')[0]).val([]);
      Session.set('selectedTaskId', null);
      $('#taskModal').modal('show');
    }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.completed);
    },
    // "click .delete": function () {
    //   Meteor.call("deleteTask", this._id);
    // },
    'click #edit': function(e) {
      e.preventDefault();

      $(':input:not(:button)', $('#taskModal')[0]).val([]);
      task = $(e.target).closest('.task');
      taskId = task.attr('data-id');
      Session.set('selectedTaskId', taskId);

      $('#taskModal').modal('show');
    }
  });

/*
  Template.user.helpers({
    var Friends = FacebookCollections.getFriends("me",["id","name"],1000);
  });
*/

  Template.taskTemplate.events({
    'click #save': function(e) {

      var taskId = Session.get('selectedTaskId');
      Session.set('selectedTaskId', null);

      var task = {
        name: $('#name').val(),
        public: $('#public')[0].checked,
        startDate: new Date($('#start-date').val()),
        dueDate: new Date($('#due-date').val()),
        value: $('#value').val(),
        notes: $('#notes').val()
      }

      if (!taskId) {
      Meteor.call('addTask', task, function(error, result) {
        if (error) {
          alert(error);
        }
      });
    } else {
      _.extend(task, {id: taskId});
      Meteor.call('editTask', task, function(error, result) {
        if (error) {
          alert(error);
        }
      });
    }

    $('#taskModal').modal('hide');
    },
  });

  Template.taskTemplate.helpers({
  task: function() {
    var taskId = Session.get('selectedTaskId');
    
    if (typeof taskId !== "undefined") {
      var task = Tasks.findOne(taskId);
      return task;
    } else {
      return {name:'', public:false, startDate:'', dueDate:'', value:'', notes:'', completed:false};
    }
  }
  });

  Meteor.setInterval(function() {
    Meteor.call('updateOverdueTasks', Meteor.userId());
  }, 60000);


}

Meteor.methods({
  addTask: function (task) {
    // Make sure the user is logged in before inserting a task

    /*
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    */
      Tasks.insert({
        name: task.name,
        public: task.public,
        startDate: task.startDate,
        dueDate: task.dueDate,
        value: task.value,
        notes: task.notes,
        completed: false,
        accountedFor: false,
        createdAt: new Date() // current time
      }, function(err, doc){
        Meteor.users.update({_id: Meteor.userId()}, {$addToSet: {tasks: doc}},
          {upsert: true});
      });

    },

  editTask: function(task) {

    Tasks.update(task.id, {$set: {
      name: task.name,
      public: task.public,
      startDate: task.startDate,
      dueDate: task.dueDate,
      value: task.value,
      notes: task.notes
    }});
  },

  // deleteTask: function (taskId) {
  //   Tasks.remove(taskId);
  // },
  setChecked: function (taskId, setChecked) {
    Tasks.update(taskId, { $set: { completed: setChecked} });
  },

  updateOverdueTasks: function (personId) {
    // console.log("personId: " + personId);
    var currentDate = new Date();
    var user = Meteor.users.findOne({_id: personId});
    // console.log("user: ", user);
    // console.log("user.tasks.length:"+ user.tasks.length);
    var newDebt = user.debt;
    // console.log(user.tasks.length);
    for (i = 0; i < user.tasks.length; i++){
      var taskId = user.tasks[i];
      // console.log(taskId);

      var task = Tasks.find({_id: taskId}).fetch()[0];
      // console.log("task: ",  task);
      if (task.dueDate.getTime()<currentDate.getTime() && !task.accountedFor){
        Tasks.update(taskId, {$set: { accountedFor: true}});
        Meteor.users.update({_id: Meteor.userId()}, 
          {$addToSet: {overdueTasks: taskId}});
        newDebt = parseFloat(newDebt) + parseFloat(task.value);
      }
    }
    Meteor.users.update({_id: Meteor.userId()}, {$inc: {debt: newDebt}});
  }

});
