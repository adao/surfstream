VideoResult = function (args) {
    console.log("in for statement");
    this.title = args.title;
    this.image_src = args.image_src;
    this.$root = args.root;
    this.videoUrl = args.videoUrl;
    console.log("in for statement");
    this.$root.find('#videoTitle').text(this.title);
    this.$root.find('#videoThumbnail').attr({
      src: this.image_src,
      alt: 'Video blah'
    });
    console.log("in for statement");
    this.$root.find('#addToPlaylist').bind('click', function (event) {
      console.log(this.videoUrl);
    });
    console.log("in for statement");
}

VideoResult.prototype = {
    
}