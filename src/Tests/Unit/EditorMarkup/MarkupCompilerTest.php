<?php

namespace Drupal\paragraphs_ckeditor\Tests\Unit\EditorMarkup;

use Drupal\Tests\UnitTestCase;

/**
 * Tests the paragraphs_ckeditor markup lexer.
 *
 * @group paragraphs_ckeditor
 * @covers \Drupal\paragraphs_ckeditor\EditorMarkup\MarkupCompiler
 */
class MarkupLexerTest extends UnitTestCase {

  public function testEmptyCompile() {
    $this->assertCompiledValues([], [], []);
  }

  public function testTextNoBufferedEntities() {
    $this->assertCompiledValues([
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
      ])
    ], [], [
    ]);
  }

  protected function assertCompiledValues(array $input_tokens, array $input_entities, array $expected_entities) {
    // Create a mock edit buffer for the compiler to read from.
    $edit_buffer = $this->getMockBuilder('\Drupal\paragraphs_ckeditor\EditBuffer\EditBuffer')
      ->setMethods(['getItem'])
      ->getMock();

    // Map input entities to the getItem method of the mock edit buffer.
    foreach ($input_entities as $input_entity) {
      $edit_buffer->expects($this->any())
        ->method('getItem')
        ->with($this->equalTo($input_entity->uuid()))
        ->willReturn($input_entity);
    }

    // Create a mock lexer that emits the provided token stream.
    $lexer = $this->getMockBuilder('\Drupal\paragraphs_ckeditor\EditorMarkup\MarkupLexer')
      ->getMock();
    $lexer->expects($this->any())
      ->method('tokenize')
      ->willReturn($lexer_input);

    $storage = $this->getMockBuilder('\Drupal\Core\Entity\Sql\SqlContentEntityStorage')
      ->getMock();
    $lexer->expects($this->any())
      ->method('create')
      ->will($this->returnCallback(array($this, 'createTextBundle

    // Create a compiler object to test.
    $compiler = new MarkupCompiler($storage, $lexer, $edit_buffer, array(
      'tag' => 'paragraphs-ckeditor-paragraph',
      'close' => TRUE,
      'attributes' => array(
        'uuid' => 'data-paragraph-uuid',
        'context' => 'data-context-hint',
      ),
    ));

    // Since the lexer object is configured to always output the exact token
    // stream that we want to test, the actual markup passed to the compiler is
    // irrelevant.
    $result = $compiler->compile('');
  }
}