AutoScroll = function(args) {
	this.bottomThreshold = args.bottomThreshold;
	this.scrollDiv = document.getElementById(args.scrollContainerId);
}

AutoScroll.prototype = {
	activeScroll: function() {
		var currentHeight = 0;

		if (this.scrollDiv.scrollHeight > 0) {
			currentHeight = this.scrollDiv.scrollHeight;
		} else {
			if (this.scrollDiv.offsetHeight > 0)
				currentHeight = this.scrollDiv.offsetHeight;
		}
		if (currentHeight - this.scrollDiv.scrollTop - this.scrollDiv.offsetHeight < this.bottomThreshold)
			this.scrollDiv.scrollTop = currentHeight;
	}
}
