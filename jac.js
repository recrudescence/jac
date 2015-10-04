Tasks = new Mongo.Collection("tasks");
Friends = new Mongo.Collection("friends");

if (Meteor.isServer) {

  Accounts.onCreateUser(function(options, user) {
    user.tasks = [];
    user.friends = [];
    user.overdueTasks = [];
    user.debt = 0;
    if(options.profile) {
      user.profile = options.profile;
    }
    return user;
  });

}

if (Meteor.isClient) {

  Accounts.ui.config({
    requestPermissions: {
        facebook: ['email', 'user_friends'],
      }
  });

  Meteor.call('getUserFriends', function(err, data) {
        console.log("WWWWW", data);
        var f_array = data.data;
        console.log(f_array);

        if (typeof data !== "undefined") {
        for (var i = 0; i <= f_array.length-1 ; i++) {
          console.log(f_array[i]);
          Meteor.call("addFriend", f_array[i]);
        };
      } else {
        console.log("nothing");
        return "nothing";
      }
    });

  Meteor.subscribe("tasks");
  Meteor.subscribe("friends");
  Meteor.subscribe("userData");
  // This code only runs on the client
  Template.body.helpers({
    tasks: function () {
      // Show newest tasks at the top
      return Tasks.find({}, {sort: {dueDate: 1}});
    },
    friends: function() {
        
        return Meteor.users.find({_id: Meteor.userId()}).fetch()[0].friends;
    }      
    }
  );

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
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    },
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
    }
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

// Template.fbdata.events({
//     'click #btn-user-data': function(e) {
//         Meteor.call('getUserData', function(err, data) {
//              $('#result').text(JSON.stringify(data, undefined, 4));
//          });
//     }
// });

/*
Template.friend.helpers({
  friend: function() {
    console.log("friends");
    console.log(Friends.findOne());
    var friend = Friends.findOne();
    return friend;
  }

});*/

Template.registerHelper('formatDate', function(date) {
  return moment(date).format('ddd, MMM Do YYYY');
});

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

  deleteTask: function (taskId) {
    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    Tasks.update(taskId, { $set: { completed: setChecked} });
  },

  addFriend: function (thefriend) {
    Meteor.users.update({ _id: Meteor.userId()}, {$addToSet: {friends: thefriend}});/*
      id: thefriend.id,
      name: thefriend.name*/
  }

  // getOverdueTasks
  // get values of tasks that don't have accounted for

  // getOverdueTasks: function(personId){
    
  // }

});