<?php

namespace App\Services\Bookmarklet;

class BookmarkletScriptBuilder
{
    public function build(string $scriptUrl): string
    {
        $encodedScriptUrl = addslashes($scriptUrl);

        return "javascript:(function(){var u='".$encodedScriptUrl."';var s=document.createElement('script');s.src=u+'&ts='+(new Date()).getTime();document.body.appendChild(s);}())";
    }
}
