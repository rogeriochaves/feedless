//
//  Samples.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

class Samples {
    static let sampleId = "@OPmmhrH+MA0zW5cuQqI9lWLDg80LrdlRYncunST3RKI=.ed25519";

    static func context() -> Context {
        return Context(
            ssbKey: SSBKey(
                curve: "foo",
                publicKey: "bar",
                privateKey: "baz",
                id: sampleId
            ),
            status: .ready
        )
    }

    static func posts() -> Posts {
        return fullProfile().posts
    }

    static func profiles() -> Profiles {
        let profiles = Profiles()
        profiles.profiles[sampleId] = .success(fullProfile())

        return profiles
    }

    static func fullProfile() -> FullProfile {
        let data = """
        {"profile":{"id":"\(sampleId)","name":"fulano","image":"&PF3pf9obYBrnKgPC26+mtqLUPl9EmAixy21bAshIvFc=.sha256","description":null},"posts":[{"key":"%0DZpZHdu0PdNLqaKjBZMR1OmzY93cqVFDHYX7J7wPZQ=.sha256","value":{"previous":"%DqsmM+oNn4htJTyofmXiNrlVsbTDGzWMpvLMnirn6J0=.sha256","sequence":147,"author":"@OPmmhrH+MA0zW5cuQqI9lWLDg80LrdlRYncunST3RKI=.ed25519","timestamp":1588364937877,"hash":"sha256","content":{"type":"post","text":"posting from standalone","root":"@OPmmhrH+MA0zW5cuQqI9lWLDg80LrdlRYncunST3RKI=.ed25519"},"signature":"5qa/GFZXmyjJrY+AwJzwHI65FurtyhVyQBOEE6meWBcbPSnn/3a/RaLu3erUgFvZ5nuCSAY0pcVlTSpy3CTlCQ==.sig.ed25519","authorProfile":{"id":"@OPmmhrH+MA0zW5cuQqI9lWLDg80LrdlRYncunST3RKI=.ed25519","name":"fulano","image":"&PF3pf9obYBrnKgPC26+mtqLUPl9EmAixy21bAshIvFc=.sha256","description":null}},"timestamp":1589102455596,"rts":1588364937877},{"key":"%ZF696HmYZGH9+08CYFdwryPy30e/CnPVjkJL1OC8KjI=.sha256","value":{"previous":"%U145VgZBu1H8QGHJBv+rg/tbpI2CScvPZdTxMyTLjhg=.sha256","sequence":5,"author":"@OPmmhrH+MA0zW5cuQqI9lWLDg80LrdlRYncunST3RKI=.ed25519","timestamp":1586091353090,"hash":"sha256","content":{"type":"post","text":"hi lorena!","wall":"@OPmmhrH+MA0zW5cuQqI9lWLDg80LrdlRYncunST3RKI=.ed25519"},"signature":"55j4GAADwsj+ZjGV+8SxEqODwH04Ed/gn5ZHUr0QWU3hZEcu/CO+JRb0E0GsCcjBeoH4WfCaoJp70uvQN4rBDA==.sig.ed25519","authorProfile":{"id":"@OPmmhrH+MA0zW5cuQqI9lWLDg80LrdlRYncunST3RKI=.ed25519","name":"fulano","image":"&PF3pf9obYBrnKgPC26+mtqLUPl9EmAixy21bAshIvFc=.sha256","description":null}},"timestamp":1589102259653.003,"rts":1586091353090},{"key":"%U145VgZBu1H8QGHJBv+rg/tbpI2CScvPZdTxMyTLjhg=.sha256","value":{"previous":"%KZH8LzhwAC3JYJxjQz4s6tpc7FC/Woln64i4YgF9BmE=.sha256","sequence":4,"author":"@OPmmhrH+MA0zW5cuQqI9lWLDg80LrdlRYncunST3RKI=.ed25519","timestamp":1586091329164,"hash":"sha256","content":{"type":"post","text":"hi lorena"},"signature":"PaT4ebWgrDyn7q5TjGih8Uj3cQNWyftxR2qoXM9xW3g+zwggTRgTIhO6YaMjKPDKTdvGbRCX2S8Q0N+nqSsZCg==.sig.ed25519","authorProfile":{"id":"@OPmmhrH+MA0zW5cuQqI9lWLDg80LrdlRYncunST3RKI=.ed25519","name":"fulano","image":"&PF3pf9obYBrnKgPC26+mtqLUPl9EmAixy21bAshIvFc=.sha256","description":null}},"timestamp":1589102259293,"rts":1586091329164}],"friends":{"friends":[{"id":"@UFDjYpDN89OTdow4sqZP5eEGGcy+1eN/HNc5DMdMI0M=.ed25519","name":null,"image":"&7sZqQXlwTy7Ce7mWnePC/ie/NdtrgtQZrxQK33TrzDc=.sha256","description":"Hi, I'm a pub created to help new butts started. [Get an invite here](https://ssb-pub.picodevelopment.nl). Something going wrong? Send a PM to [@HendrikPeter](@Bp5Z5TQKv6E/Y+QZn/3LiDWMPi63EP8MHsXZ4tiIb2w=.ed25519)."},{"id":"@r52fjRv2b8IOfI8PCiplwypildy3u72KOyNKmQOcUmw=.ed25519","name":"lorena","image":null,"description":null},{"id":"@iGzQPg2AOPCu0h71+ewh7klUO/gQPfFvuqnNNSigQMU=.ed25519","name":"beltrano","image":null,"description":null}],"requestsSent":[{"id":"@k2bLLFxiOZFILevmGANkt1waWzg2FXoZuWNx5VLmlZ4=.ed25519","name":null,"image":null,"description":null}],"requestsReceived":[{"id":"@XTiE4EJSylnYbMKNVUIJczy5MMsJRhVp/YnPIG+Rruc=.ed25519","name":"Feedless Pub","image":"&JKsUl2ozYg6iRYAQ4pm/Sgahne8Ymtjy3fA+e24BbE4=.sha256","description":null},{"id":"@VUgbo/ihmVWgh7szFJcG0Tg395T5/8JU0jijEVmyByU=.ed25519","name":"rchaves","image":"&574bqm3OKE8mKwBjK3TjTj5PuQxl8GElvFyM+JoSBHY=.sha256","description":"nah"},{"id":"@5e3FkSr1OEVb2TEMAYJYIgfT4KC9xpdLdIeDwjZQip4=.ed25519","name":"Thomas Renkert","image":"&ohem17Tn6Q26IsJw2K+/7RFP6gs9Q9hVwvGJBfs7pRY=.sha256","description":"theology, diakonia, global health justice, philosophy, digitalisation, open humanities\\n\\n\\n"}]}}
        """.data(using: .utf8)!

        return try! JSONDecoder().decode(FullProfile.self, from: data)
    }
}
