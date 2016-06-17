
// Function for starting Sense task, given its task ID (as it appears in the QMC task list)
module.exports = function (taskId) {
  qrs.post( '/qrs/task/' + taskId + '/start')
    .then( function ( data) {
      console.info('return value: ', data );

    }, function ( err ) {
      console.error( 'An error occurred: ', err);

    }
  )
}
