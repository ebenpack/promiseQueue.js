define([
    'intern!tdd',
    'intern/chai!assert',
    'intern/dojo/node!../index.js'
], function(tdd, assert, promiseQueue) {

    function generatePromise(i) {
        // Return a function that returns a simple promise.
        // If i is even, the promise will resolve to i, if
        // it is odd, it will reject.
        return function() {
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    if (i % 2 === 0) {
                        resolve(i);
                    } else {
                        reject(new Error('Rejected. Value: ' + i + ' is odd.'));
                    }
                }, 10);
            });
        };
    }

    tdd.suite('promiseQueue', function() {
        tdd.test('processes all promises in the queue', function() {
            var dfd = this.async();
            var queueLen = 9;
            var delay = 200;
            var maxConcurrency = 3;
            var q = promiseQueue(delay, maxConcurrency);
            var i;
            // Generate the promise queue
            for (i = 0; i < queueLen; i++) {
                q.push(generatePromise(i));
            }
            // The expected execution time for the entire promise queue should
            // be no less than the length of the promise queue, divided by the
            // maximum concurrency, multipled by the delay between executions.
            var expectedDelay = Math.floor(queueLen / maxConcurrency) * delay;
            var start = Date.now();
            q.start();
            // As the promise queue processing has begun, we will
            // expect these pushes to be no-ops.
            q.push(generatePromise(1729));
            q.push(generatePromise(999));
            q.promise
                .then(function(resultsArr) {
                    var actual = Date.now() - start;
                    if (actual < expectedDelay) {
                        // The promise queue was processed more quickly than expected. This may
                        // indicate that the queue is not respecting the maxConcurrency parameter.
                        dfd.reject(
                            'Promise queue resolved more quickly than expected. Expected time: ' +
                            expectedDelay + 'ms. Actual time: ' + actual + 'ms.'
                        );
                    } else if (resultsArr.length !== queueLen) {
                        // We receieved more items in the results array than expected. This may
                        // indicate that the user was able to push items to the queue after
                        // processing had begun.
                        dfd.reject(
                            'Promise queue returned array with more items than expected. Expected ' +
                            queueLen + ' items, received' + resultsArr.length + ' items'
                        );
                    } else {
                        resultsArr.forEach(function(val, idx) {
                            if (idx % 2 === 0) {
                                if (val && val.message) {
                                    // We do not expect any errors for even numbered results.
                                    // This may indicate that the order of the promise queue was
                                    // not preserved in the results array.
                                    dfd.reject('promiseQueue did not resolve expected value. Actual value: ' + val);
                                } else if (val !== idx) {
                                    // We did not receieve the expected value in the results array.
                                    // This may indicate that the order of the promise queue was
                                    // not preserved in the results array.
                                    dfd.reject('promiseQueue did not resolve expected value. Actual value: ' + val);
                                } else {
                                    // Everything worked!
                                    dfd.resolve('promiseQueue successfully resolved to the expected value.');
                                }
                            } else {
                                if (val && val.message && val.message === 'Rejected. Value: ' + idx + ' is odd.') {
                                    // We received the correct results. We expect
                                    // odd numbered results to be errors.
                                    dfd.resolve(val);
                                } else {
                                    // We did not receive the expected value.
                                    dfd.reject(val);
                                }
                            }
                        });
                    }

                })
                .catch(function(e) {
                    // We do not expect the promise queue to reject
                    dfd.reject(e.message);
                });
        });
    });
});