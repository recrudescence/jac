Tasks = new Mongo.Collection("tasks");
Friends = new Mongo.Collection("friends");

if (Meteor.isServer) {

  Accounts.onCreateUser(function(options, user) {
    user.tasks = [];
    user.friends = [];
    user.overdueTasks = [];
    user.balance = 0;
    user.temp = 0;
    user.alert = false;
    user.fb_id = user.services.facebook.id;

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

      var result = Meteor.users.find({_id: Meteor.userId()}, {tasks: 1, _id: 0}).fetch();
      console.log(result[0].tasks);

      if (result[0].tasks !== null){
        return Tasks.find({'_id': {'$in': result[0].tasks}}, {sort: {completed: false, dueDate: 1}});
      }
      else {
        return null;
      }

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

  Template.taskTemplate.events({
    'click #save': function(e) {

      var taskId = Session.get('selectedTaskId');
      Session.set('selectedTaskId', null);

      var task = {
        name: $('#name').val(),
        public: $('#public')[0].checked,
        startDate: new Date($('#start-date').val()),
        dueDate: new Date($('#due-date').val()),
        value: parseInt($('#value').val()),
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

Template.friend.helpers({
  friend: function() {
    return Friends.findOne().data;
  }

});

Template.registerHelper('formatDate', function(date) {
  return moment(date).format('ddd, MMM Do YYYY');
});

Meteor.setInterval(function() {
  Meteor.call('updateOverdueTasks', Meteor.userId());
}, 60000);
Meteor.setInterval(function() {
  Meteor.call('transferToBalance', Meteor.userId());
}, 60000);
Meteor.setInterval(function() {
  Meteor.call('checkAlertStatus', Meteor.userId());
}, 60000);


Template.registerHelper('formatDate', function(date) {
  return moment(date).format('ddd, MMM Do YYYY');
});

}

Meteor.methods({

  addTask: function (task) {
    // Make sure the user is logged in before inserting a task

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
  updateOverdueTasks: function (personId) {
    var currentDate = new Date();
    var user = Meteor.users.findOne({_id: personId});
    var newTemp = parseInt(user.temp);

    for (i = 0; i < user.tasks.length; i++){
      var taskId = user.tasks[i];

      var task = Tasks.find({_id: taskId}).fetch()[0];
      if (task.dueDate<currentDate && !task.accountedFor){
        Tasks.update(taskId, {$set: { accountedFor: true}});
        Meteor.users.update({_id: Meteor.userId()}, 
          {$addToSet: {overdueTasks: taskId}});
        newTemp = parseInt(newTemp) + parseInt(task.value);
      }
    }
    Meteor.users.update({_id: Meteor.userId()}, {$inc: {temp: newTemp}});
  },

  transferToBalance: function (personId) {
      var user = Meteor.users.findOne({_id: personId});

      console.log("in transferToBalance");
      var temp = parseInt(user.temp);

      if (temp > 0){
        Meteor.users.update({_id: Meteor.userId()}, {$inc: {balance: -1 * temp}});
        Meteor.users.update({_id: Meteor.userId()}, {$set: {temp: 0}});

 //       alert("Your balance decreased by " + temp + " because you didn't complete some tasks on time!");

        var friends = user.friends;
        console.log("friends", friends);
        console.log("friends[0]", friends[0]);
        console.log("friends[0].id", friends[0].user_id);

        var max_balance = -999999;
        var max_index = -1;
        for (i = 0; i < friends.length; i++){
          var friend = Meteor.users.findOne({_id: friends[i].user_id});
          console.log("friend", friend);
          var friend_balance = friend.balance;
          console.log("friend_balance", friend_balance);
          console.log("friend_balance: ", friend_balance);
          if (max_balance < friend_balance) {
            max_balance = friend_balance;
            max_index = i;
          }
        }
        console.log("max_index", max_index);

        if (max_index > -1) {
          Meteor.users.update({_id: friends[i].user_id}, {$inc: {balance: temp}}, {$set: {alert: true}});
        }


      }

      
  },

  checkAlertStatus: function (personId) {
    var user = Meteor.users.findOne({_id: personId});

    if (user.alert) {
      Meteor.users.update({_id: personId}, {$set: {alert: false}});
      alert("Your balance increased to " + user.balance + " because one of your friends suck at completing tasks on time!");
    }
  },

  addFriend: function (thefriend) {
    console.log("thefriend.id", thefriend.id);
    var friend_user = Meteor.users.findOne({"fb_id": thefriend.id});
  //  var friend_user_fetch = friend_user.fetch();
    console.log('friend_user', friend_user);
 //       console.log('friend_user_fetch', friend_user_fetch);
    if (friend_user) {

      Meteor.users.update({ _id: Meteor.userId()}, {$addToSet: {friends: {user_id: friend_user.id, id: thefriend.id, name: thefriend.name}}});
    }
  }

});
