<?php

class FormValueCompiler {

  public function __construct(LexerInterface $lexer, EditBufferInterface $buffer, $text_bundle, array $embed_template) {
    $this->buffer = $buffer;
    $this->embedTemplate = $embed_template;
    $this->textBundle = $text_bundle;
    $this->lexer = $lexer;
  }

  public function compile($markup) {
    $values = array();

    $tokens = $this->lexer->tokenize($markup);
    foreach ($tokens as $token) {
      if ($token->type == Lexer::TOKEN_EMBED) {
        $values[] = $this->buffer->getItem($token->uuid);
      }
      else {
      }
    }
  }
}
