<?php

interface EmbedCodeProcessorInterface {
  public function process($markup, EmbedCodeVisitorInterface $visitor);
}
