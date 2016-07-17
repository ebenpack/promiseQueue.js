/**
 * Creates a promise queue, which executes a series
 * of promises in the queue sequentially, with (potentially)
 * some delay between each promise. Returns an object with
 * several methods for interacting with the queue (starting,
 * stopping, etc.), as well as a promise that resolves to
 * an array of the results of each promise in the queue.
 * @param {number} delay Delay time between each promise
 * @param {number} maxConcurrency Maximum number of promises in the queue to execute concurrently
 * @return {Object}
 */
function promiseQueue(delay, maxConcurrency) {
    if (!(this instanceof promiseQueue)) {
        return new promiseQueue(delay, maxConcurrency);
    }
    var resolve = null;
    var reject = null;
    var queue = [];
    var results = [];
    var length = 0;
    var timeoutId = null;
    var currentOperations = 0;
    var p = new Promise(function(res, rej) {
        resolve = res;
        reject = rej;
    });

    /**
     * Start processing promises on the queue.
     */
    function start() {
        // Once we have started working on
        // the queue, set the length (which
        // we will use to determine when all
        // work has been complete), and make
        // `push` a no-op (having promises pushed
        // to the queue while it is being operated
        // on would be a big hassle, and anyway,
        // we don't require it for our purposes here)
        length = queue.length;
        this.push = function() {};
        timeoutId = setTimeout(function() {
            executeNextPromise();
        }, delay);
    }

    /**
     * Make the next promise in the queue.
     * If all work has been completed, the
     * promise will resolve. Otherwise, further
     * promises are scheduled as appropriate.
     */
    function executeNextPromise() {
        var fn;
        if (currentOperations < maxConcurrency && queue.length > 0) {
            // If the queue hasn't fully drained, and we
            // are below our concurrency threshold, then
            // keep working
            currentOperations++;
            fn = queue.shift();

            function final() {
                currentOperations--;
                if (queue.length > 0) {
                    // If there are promises left in the
                    // queue, schedule the next execution
                    timeoutId = setTimeout(function() {
                        executeNextPromise();
                    }, delay);
                } else if (results.length === length) {
                    // If the queue is empty, and all
                    // results are accounted for, resolve 
                    resolve(results);
                }
            }
            fn()
                .then(function(data) {
                    results.push(data);
                    final();
                })
                .catch(function(e) {
                    results.push(e);
                    final();
                });
            if (queue.length > 0) {
                // There are promises left in the queue,
                // but we are at our concurrency threshold,
                // so schedule another execution for later
                timeoutId = setTimeout(function() {
                    executeNextPromise();
                }, delay);
            }
        }
    }

    /**
     * Push a promise onto the queue.
     * @return {Function}
     */
    function push(fn) {
        queue.push(fn);
    }

    this.promise = p;
    this.start = start;
    this.executeNextPromise = executeNextPromise;
    this.push = push;
}

module.exports = promiseQueue;