//
//  Search.swift
//  feedless
//
//  Created by Rogerio Chaves on 24/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

typealias PeopleResult = AuthorProfileContent<AnyContent>

struct AnyContent : Codable {
    public var type: String
}

struct SearchResults : Codable {
    public var people: [PeopleResult]
    public var communities: [String]
}

class Search: ObservableObject {
    @Published var results : ServerData<SearchResults> = .notAsked

    func load(context: Context, query: String) {
        if query.count < 3 {
            self.results = .error("Type at least 3 characters")
            return
        }

        DispatchQueue.main.async {
            self.results = .loading
        }

        if let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            dataLoad(path: "/search?query=\(encodedQuery)", type: SearchResults.self, context: context) {(result) in
                DispatchQueue.main.async {
                    self.results = result
                }
            }
        }
    }
}
