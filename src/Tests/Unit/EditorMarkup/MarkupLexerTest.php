<?php

namespace Drupal\paragraphs_ckeditor\Tests\Unit\EditorMarkup;

use Drupal\Tests\UnitTestCase;
use Drupal\paragraphs_ckeditor\EditorMarkup\MarkupLexer;

/**
 * Tests the paragraphs_ckeditor markup lexer.
 *
 * @group paragraphs_ckeditor
 * @covers \Drupal\paragraphs_ckeditor\EditorMarkup\MarkupLexer
 */
class MarkupLexerTest extends UnitTestCase {

  /**
   * @var Drupal\paragraphs_ckeditor\EditorMarkup\MarkupLexer
   */
  protected $lexer;

  /**
   * {@inheritdoc}
   */
  public function setUp() {
    $this->lexer = new MarkupLexer('test', array(
      'tag' => 'paragraphs-ckeditor-paragraph',
      'close' => TRUE,
      'attributes' => array(
        'uuid' => 'data-paragraph-uuid',
        'context' => 'data-context-hint',
      ),
    ));
  }

  /**
   * Tests tokenizing a single html element.
   */
  public function testElement() {
    $test = '<a href="test">test</a>';
    $this->assertTokenizeResult($test, array(
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
        'text' => '<a href="test">test</a>',
      ])
    ));
  }

  /**
   * Tests tokenizing a single embed code.
   */
  public function testEmbedCode() {
    $test = '<paragraphs-ckeditor-paragraph data-paragraph-uuid="111111" data-context-hint="test"></paragraphs-ckeditor-paragraph>';
    $this->assertTokenizeResult($test, array(
      $this->token([
        'type' => MarkupLexer::TOKEN_EMBED,
        'uuid' => '111111',
        'context' => 'test',
      ]),
    ));
  }

  /**
   * Tests a linear list of embed codes and elements.
   */
  public function testLinearList() {
    $test = '
      <p>test1</p>
      <p>test2</p>
      <paragraphs-ckeditor-paragraph data-paragraph-uuid="111111" data-context-hint="test"></paragraphs-ckeditor-paragraph>
      <p>test3</p>
      <p>test4</p>
      <paragraphs-ckeditor-paragraph data-paragraph-uuid="222222" data-context-hint="test"></paragraphs-ckeditor-paragraph>
      <p>test5</p>
      <p>test6</p>
      <paragraphs-ckeditor-paragraph data-paragraph-uuid="333333" data-context-hint="test"></paragraphs-ckeditor-paragraph>
      <paragraphs-ckeditor-paragraph data-paragraph-uuid="444444" data-context-hint="test"></paragraphs-ckeditor-paragraph>
    ';
    $this->assertTokenizeResult($test, array(
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
        'text' => '<p>test1</p><p>test2</p>',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_EMBED,
        'uuid' => '111111',
        'context' => 'test',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
        'text' => '<p>test3</p><p>test4</p>',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_EMBED,
        'uuid' => '222222',
        'context' => 'test',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
        'text' => '<p>test5</p><p>test6</p>',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_EMBED,
        'uuid' => '333333',
        'context' => 'test',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_EMBED,
        'uuid' => '444444',
        'context' => 'test',
      ]),
    ));
  }

  /**
   * Tests embed codes nested in other elements.
   */
  public function testNormalTree() {
    $test = '
      <p>test1</p>
      <div>
        <p>test2</p>
        <paragraphs-ckeditor-paragraph data-paragraph-uuid="111111" data-context-hint="test"></paragraphs-ckeditor-paragraph>
        <p>test3</p>
      </div>
      <div>
        <p>test4</p>
        <div>
          <paragraphs-ckeditor-paragraph data-paragraph-uuid="222222" data-context-hint="test"></paragraphs-ckeditor-paragraph>
          <p>test5</p>
        </div>
        <p>test6</p>
        <paragraphs-ckeditor-paragraph data-paragraph-uuid="333333" data-context-hint="test"></paragraphs-ckeditor-paragraph>
      </div>
      <paragraphs-ckeditor-paragraph data-paragraph-uuid="444444" data-context-hint="test"></paragraphs-ckeditor-paragraph>
    ';
    $this->assertTokenizeResult($test, array(
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
        'text' => '<p>test1</p><div><p>test2</p></div>',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_EMBED,
        'uuid' => '111111',
        'context' => 'test',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
        'text' => '<div><p>test3</p></div><div><p>test4</p></div>',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_EMBED,
        'uuid' => '222222',
        'context' => 'test',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
        'text' => '<div><div><p>test5</p></div><p>test6</p></div>',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_EMBED,
        'uuid' => '333333',
        'context' => 'test',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_EMBED,
        'uuid' => '444444',
        'context' => 'test',
      ]),
    ));
  }

  /**
   * Test plain text.
   */
  public function testRawText() {
    $test = 'some text not in a tag';
    $this->assertTokenizeResult($test, array(
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
        'text' => '<p>' . $test . '</p>',
      ]),
    ));
  }

  /**
   * Test plain text separated by embed code.
   */
  public function testRawTextWithEmbed() {
    $test = 'some text' .
      '<paragraphs-ckeditor-paragraph data-paragraph-uuid="111111" data-context-hint="test"></paragraphs-ckeditor-paragraph>' .
      'not in a tag';
    $this->assertTokenizeResult($test, array(
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
        'text' => '<p>some text</p>',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_EMBED,
        'uuid' => '111111',
        'context' => 'test',
      ]),
      $this->token([
        'type' => MarkupLexer::TOKEN_TEXT,
        'text' => 'not in a tag',
      ]),
    ));
  }

  /**
   * Asserts that a given input emits an expected token stream.
   *
   * @param string $input_markup
   *   The input markup to tokenize.
   * @param array $expected_tokens
   *   An ordered array of tokens expected to be equal to the output stream.
   *   Note that order is enforced in the assertion.
   */
  protected function assertTokenizeResult($input_markup, array $expected_tokens) {
    $result = $this->lexer->tokenize($input_markup);

    // Standardize the expected and actual values to make them easier to compare
    // and debug when errors occur.
    foreach ($expected_tokens as &$token) {
      if ($token->type == MarkupLexer::TOKEN_TEXT) {
        $token->text = base64_encode(preg_replace('/[\r\n]/', '', $token->text));
      }
    }
    foreach ($result as &$token) {
      if ($token->type == MarkupLexer::TOKEN_TEXT) {
        $token->text = base64_encode(preg_replace('/[\r\n]/', '', $token->text));
      }
    }

    $this->assertEquals($expected_tokens, $result, 'Mismatched tokenization result');
  }

  /**
   * Convenience function to create tokens for code readability.
   */
  protected function token(array $values) {
    return (object)$values;
  }
}
