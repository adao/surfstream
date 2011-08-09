$(function(){
	window.RoomModel = Backbone.Model.extend({		

		updateDisplayedUsers : function (userJSONArray) {
			var hash = {};
			var userCollection = this.get("userCollection");
			for (var user in userJSONArray) {
				if (!userCollection.get(userJSONArray[user].id)) {
					userCollection.add(userJSONArray[user]);
				} 
				hash[userJSONArray[user].id] = true;
			}
			
			userCollection.forEach(function(userModel) {
				if (!hash[userModel.get('id')]) userModel.collection.remove(userModel);
			});
			
		}
		
		
	})
});