<?php

interface CommandDispatcherInterface {

  public function dispatchCommand($name, array $args);
}
