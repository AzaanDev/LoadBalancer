function Strategy() {
  this.select = null;
}

function RoundRobinStrategy() {
  this.select = function () {};
}

const Strategies = {
  roundrobin: RoundRobinStrategy,
};
